import type { Page } from '@playwright/test'
import { initialTransition, transition } from 'xstate'
import {
  describeEvent,
  type GuardWrapper,
  type Machine,
  type ModelEvent,
  type PageFacts,
  type Snapshot,
  toStateString,
} from '../model.ts'
import type { PageModule } from '../pages.ts'
import { type CoverageModel, edgeKey } from '../paths.ts'
import type { Basis, ModelChannel, Verdict } from '../protocol.ts'
import { findRestingState, restingSnapshot } from './anchor.ts'
import { writeChannel } from './channel.ts'
import { runChecks } from './checks.ts'
import { describeFailure } from './failures.ts'
import { createGuardRecorder } from './guards.ts'
import { createLedger, leaves } from './ledger.ts'
import { outcomeOf } from './outcome.ts'
import { arrival, createStepClock, settledFacts } from './waiting.ts'

interface RunnerOptions<
  F extends PageFacts,
  E extends ModelEvent,
  C extends object = Context,
> {
  readonly createMachine: (wrapGuard: GuardWrapper) => Machine
  readonly events: readonly E[]
  readonly pages: PageModule<F, Snapshot, E>
  readonly page: Pick<Page, 'evaluate' | 'waitForLoadState'>
  readonly readFacts: () => Promise<F | null>
  readonly oracle: boolean
  readonly stepBudgetMs?: number
  /**
   * After a loose action: the event that moves the model to the page the
   * browser shows, or null when the page is still where the model is.
   */
  readonly arrive?: (facts: F, context: C) => E | null
  /** Values the model always takes from the page after a step. */
  readonly observe?: (facts: F, context: C) => Partial<C>
  /** Counts each event per abstract state, for the explorer's weights. */
  readonly coverage?: CoverageModel
}

export interface RunnerHealth {
  readonly steps: number
  readonly looseActions: number
  /** Steps whose page showed the predicted state only after the settle window. */
  readonly lateArrivals: readonly string[]
  readonly staleEvents: number
  readonly runnerErrors: readonly string[]
  readonly violations: readonly Verdict[]
}

export interface ModelRunner<E extends ModelEvent = ModelEvent> {
  start(): Promise<void>
  modelEvent(event: E): Promise<void>
  resync(): Promise<void>
  /** Bombadil acted on its own: find where the page is now. */
  settle(): Promise<void>
  health(): RunnerHealth
}

type Context = Readonly<Record<string, unknown>>
type Evidence = Pick<Basis, 'decisions' | 'relied'>

const STEP_BUDGET_MS = 4_000
const PASS: Verdict = { ok: true }
const NO_EVIDENCE: Evidence = { decisions: [], relied: [] }

const sameEvent = (a: ModelEvent, b: ModelEvent): boolean =>
  a.type === b.type && JSON.stringify(a.data) === JSON.stringify(b.data)
const contextOf = (snapshot: Snapshot): Context => snapshot.context as Context
const stateOf = (snapshot: Snapshot): string => toStateString(snapshot.value)

export function createModelRunner<
  F extends PageFacts,
  E extends ModelEvent = ModelEvent,
  C extends object = Context,
>(options: RunnerOptions<F, E, C>): ModelRunner<E> {
  const recorder = createGuardRecorder()
  const machine = options.createMachine(recorder.wrapGuard)
  const ledger = createLedger()
  const clock = createStepClock(options.stepBudgetMs ?? STEP_BUDGET_MS)
  const { probes, states, events: handlers } = options.pages
  const taken = new Map<string, number>()
  const health = {
    steps: 0,
    looseActions: 0,
    lateArrivals: [] as string[],
    staleEvents: 0,
    runnerErrors: [] as string[],
    violations: [] as Verdict[],
  }

  // Where the model is, and what the current move has gathered.
  let snapshot: Snapshot = initialTransition(machine)[0]
  let lost = false
  let lastFacts: F | null = null
  let evidence = NO_EVIDENCE
  let move = 0
  let seq = 0

  async function readFacts(): Promise<F | null> {
    const facts = await options.readFacts()
    if (facts !== null) lastFacts = facts
    return facts
  }

  const enabled = (): E[] =>
    lost ? [] : options.events.filter((event) => snapshot.can(event))

  const edgeOf = (event: ModelEvent): string | null =>
    options.coverage === undefined
      ? null
      : edgeKey(options.coverage, snapshot, event)

  /** The model moves to `next`; the ledger notes which values `source` set. */
  function moveTo(next: Snapshot, source: string): void {
    ledger.changed(contextOf(snapshot), contextOf(next), source)
    snapshot = next
    lost = false
  }

  /** In plain mode a failed verdict is only logged, and the step passes. */
  function judged(verdict: Verdict): Verdict {
    if (verdict.ok || options.oracle) return verdict
    health.runnerErrors.push(`plain: ${verdict.kind}: ${verdict.message}`)
    return PASS
  }

  /**
   * Finds the page's state and moves the model there. Not found, the model is
   * lost: ambiguous probes or a page that never settles are runner errors, a
   * page no state matches is a verdict.
   */
  async function reanchor(): Promise<{
    observed: string | null
    verdict: Verdict
  }> {
    const { facts, result, resting } = await findRestingState(
      readFacts,
      machine,
      probes,
      contextOf(snapshot),
      clock.settleMs(),
    )
    if (resting !== null) {
      moveTo(resting, `the page at step ${move}`)
      return { observed: stateOf(resting), verdict: PASS }
    }
    lost = true
    switch (result?.kind) {
      case 'ambiguous':
        health.runnerErrors.push(
          `ambiguous probes: ${result.candidates.join(', ')}`,
        )
        return { observed: null, verdict: PASS }
      case 'state':
        health.runnerErrors.push(`page never settled out of ${result.state}`)
        return { observed: null, verdict: PASS }
      default:
        return {
          observed: null,
          verdict: judged({
            ok: false,
            kind: 'unrecognised',
            state: stateOf(snapshot),
            observed: facts?.url ?? '(no page)',
            message: 'the page matches no machine state',
          }),
        }
    }
  }

  /** The predicted snapshot, with what the page always tells (observe). */
  function withObserved(next: Snapshot): Snapshot {
    if (options.observe === undefined || lastFacts === null) return next
    const observed = options.observe(lastFacts, contextOf(next) as C)
    return (
      restingSnapshot(machine, stateOf(next), {
        ...contextOf(next),
        ...observed,
      }) ?? next
    )
  }

  /** The page object's handler for the event; the failure, or null. */
  async function act(event: E): Promise<string | null> {
    try {
      const handler = handlers[event.type]
      if (handler === undefined)
        throw new Error(`no page object handles ${event.type}`)
      await handler(event, snapshot)
      return null
    } catch (error) {
      return describeFailure(error)
    }
  }

  /**
   * One step: the model predicts, the page object acts (unless Bombadil
   * already did: perform = false), the page must show the prediction and
   * pass its checks.
   */
  async function step(event: E, perform: boolean): Promise<Verdict> {
    const from = stateOf(snapshot)
    const edge = perform ? edgeOf(event) : null
    if (edge !== null) taken.set(edge, (taken.get(edge) ?? 0) + 1)
    const { result, decisions } = recorder.track(() =>
      transition(machine, snapshot, event),
    )
    const [next] = result
    const source = `${describeEvent(event)} at step ${move}`
    const setNow = { before: contextOf(snapshot), source }
    evidence = {
      ...evidence,
      decisions: decisions.map(({ guard, result: decided, read }) => ({
        guard,
        result: decided,
        read: ledger.cite(Object.entries(read), setNow),
      })),
    }

    if (perform) {
      health.steps += 1
      const failure = await act(event)
      if (failure !== null) {
        await reanchor()
        return judged({
          ok: false,
          kind: 'handler',
          state: from,
          event,
          message: failure,
        })
      }
    }

    const shown = await arrival(readFacts, probes, next, clock)
    if (shown === 'never') {
      const { observed } = await reanchor()
      const expected = [stateOf(next)]
      return judged({
        ok: false,
        kind: 'unexpected-state',
        state: from,
        event,
        expected,
        observed: observed ?? '(unrecognised)',
        message: `expected ${expected.join(' or ')}`,
      })
    }
    if (shown === 'late')
      health.lateArrivals.push(`${describeEvent(event)} → ${stateOf(next)}`)
    moveTo(withObserved(next), source)

    const failed = options.oracle ? await runChecks(states, snapshot) : null
    if (failed === null) return PASS
    evidence = { ...evidence, relied: ledger.cite(Object.entries(failed.read)) }
    return judged({
      ok: false,
      kind: 'assertion',
      state: stateOf(snapshot),
      event,
      message: failed.failure,
    })
  }

  /**
   * A numbered move in the journey; a failed one gets its basis (the guards,
   * the values it relied on, the page) and is kept among the violations.
   */
  async function makeMove(
    label: string,
    from: string | null,
    run: () => Promise<Verdict>,
  ): Promise<Verdict> {
    move += 1
    evidence = NO_EVIDENCE
    const verdict = await run()
    ledger.note(
      `#${move} ${label}: ${outcomeOf(verdict, from, stateOf(snapshot), lost)}`,
    )
    if (verdict.ok) return verdict
    const failed: Verdict = {
      ...verdict,
      basis: {
        ...evidence,
        context: ledger.cite(leaves(snapshot.context)),
        page: lastFacts === null ? null : ({ ...lastFacts } as Context),
        journey: ledger.journey(),
      },
    }
    health.violations.push(failed)
    return failed
  }

  /** Tells Bombadil where the model is, what it may do next, and the verdict. */
  async function publish(verdict: Verdict): Promise<void> {
    seq += 1
    const events = enabled()
    const channel: ModelChannel = {
      seq,
      busy: null,
      state: stateOf(snapshot),
      enabled: events,
      taken: events.map((event) => taken.get(edgeOf(event) ?? '') ?? 0),
      verdict: verdict.ok ? verdict : { ...verdict, basis: undefined },
    }
    if (!(await writeChannel(options.page, channel)))
      health.runnerErrors.push(`could not publish step ${seq}`)
  }

  /** One call from Bombadil: a fresh time budget, the work, then the channel. */
  async function turn(run: () => Promise<Verdict>): Promise<void> {
    clock.restart()
    await publish(await run())
  }

  return {
    start: () => turn(async () => (await reanchor()).verdict),

    modelEvent: (event) =>
      turn(async () => {
        if (!enabled().some((candidate) => sameEvent(candidate, event))) {
          health.staleEvents += 1
          return PASS
        }
        return makeMove(describeEvent(event), stateOf(snapshot), () =>
          step(event, true),
        )
      }),

    resync: () =>
      turn(() =>
        makeMove('re-anchor', null, async () => (await reanchor()).verdict),
      ),

    settle: () =>
      turn(() =>
        makeMove('loose action', stateOf(snapshot), async () => {
          health.looseActions += 1
          const facts = await settledFacts(readFacts, clock)
          const event =
            facts === null || options.arrive === undefined
              ? null
              : options.arrive(facts, contextOf(snapshot) as C)
          return event === null
            ? (await reanchor()).verdict
            : step(event, false)
        }),
      ),

    health: () => ({
      ...health,
      lateArrivals: [...health.lateArrivals],
      runnerErrors: [...health.runnerErrors],
      violations: [...health.violations],
    }),
  }
}
