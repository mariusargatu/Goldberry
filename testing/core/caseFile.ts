import { describeEvent } from './model.ts'
import {
  type Basis,
  EVENT_SOURCE,
  type Relied,
  type Verdict,
} from './protocol.ts'

export interface Evidence {
  readonly violated: readonly string[]
  readonly verdict: Extract<Verdict, { ok: false }> | null
  readonly details: string
}

const humanState = (state: string): string => state.split('.').join(' › ')

const HISTORY_NOTE = ' (the browser loaded this page by Back or Reload)'

function cite(relied: Relied): string {
  const value = `${relied.path} = ${JSON.stringify(relied.value)}`
  return relied.source === EVENT_SOURCE
    ? value
    : `${value}, from ${relied.source}`
}

function decisions(basis: Basis): string[] {
  if (basis.decisions.length === 0) return []
  const cited = (read: readonly Relied[]) =>
    read.length === 0 ? '' : ` (${read.map(cite).join('; ')})`
  return [
    'Why the model expected that (its guards, in the order it evaluated them):',
    ...basis.decisions.map(
      ({ guard, result, read }) =>
        `- ${guard}: ${result ? 'yes' : 'no'}${cited(read)}`,
    ),
  ]
}

function otherValues(basis: Basis): string[] {
  const cited = new Set(
    [
      ...basis.decisions.flatMap((decision) => decision.read),
      ...basis.relied,
    ].map((relied) => relied.path),
  )
  const rest = basis.context.filter((relied) => !cited.has(relied.path))
  return rest.length === 0
    ? []
    : [`Other values the model held: ${rest.map(cite).join('; ')}`]
}

const isEmpty = (fact: unknown): boolean =>
  fact === null ||
  fact === undefined ||
  fact === '' ||
  (typeof fact === 'object' && Object.keys(fact).length === 0)

function pageFacts(page: Basis['page']): string {
  if (page === null) return 'Page facts: none (the page was between documents)'
  const shown = Object.entries(page).filter(([, fact]) => !isEmpty(fact))
  return `Page facts: ${shown.map(([name, fact]) => `${name} ${typeof fact === 'object' ? JSON.stringify(fact) : String(fact)}`).join('; ')}`
}

function verdictLines(
  verdict: NonNullable<Evidence['verdict']>,
  historyEvents: readonly string[],
): string[] {
  const history =
    verdict.event !== undefined && historyEvents.includes(verdict.event.type)
  const step = `Step: ${describeEvent(verdict.event)}${history ? HISTORY_NOTE : ''}`
  const from = `Model state when judged: ${humanState(verdict.state)}`
  switch (verdict.kind) {
    case 'unexpected-state':
      return [
        step,
        `The model expected: ${(verdict.expected ?? []).map(humanState).join(' or ')}`,
        `The page showed: ${humanState(verdict.observed ?? '(unrecognised)')}`,
      ]
    case 'assertion':
      return [step, from, `The page-object check failed: ${verdict.message}`]
    case 'handler':
      return [step, from, `The page-object step failed: ${verdict.message}`]
    case 'unrecognised':
      return [
        step,
        `The page matched no model state: ${verdict.observed ?? ''}`,
      ]
  }
}

function basisLines(basis: Basis): string[] {
  const relied = basis.relied.map((value) => `- ${cite(value)}`)
  return [
    ...decisions(basis),
    ...(relied.length === 0
      ? []
      : [
          "What the check relied on (the model's values, and the step that set each):",
          ...relied,
        ]),
    ...otherValues(basis),
    pageFacts(basis.page),
    'Model journey (oldest first):',
    ...basis.journey.map((entry) => `- ${entry}`),
  ]
}

export function renderCase(
  { violated, verdict, details }: Evidence,
  historyEvents: readonly string[],
): string {
  const bombadil = details === '' ? [] : ['Bombadil reported:', details]
  return [
    `Violated: ${violated.join(', ')}`,
    ...(verdict === null ? bombadil : verdictLines(verdict, historyEvents)),
    ...(verdict?.basis === undefined ? [] : basisLines(verdict.basis)),
  ].join('\n')
}
