import type { GuardWrapper } from '../model.ts'
import { watchReads } from './reads.ts'

interface GuardDecision {
  readonly guard: string
  readonly result: boolean
  readonly read: Readonly<Record<string, unknown>>
}

export function createGuardRecorder() {
  let decisions: GuardDecision[] | null = null
  const wrapGuard: GuardWrapper = (name, guard) => (args) => {
    if (decisions === null) return guard(args)
    const read: Record<string, unknown> = {}
    const onRead = (path: string, value: unknown) => {
      if (path !== 'event.type') read[path] = value
    }
    const result = guard({
      context: watchReads(args.context, onRead),
      event: watchReads(args.event, onRead, 'event.'),
    })
    decisions.push({ guard: name, result, read })
    return result
  }
  const track = <T>(run: () => T) => {
    const recorded: GuardDecision[] = []
    decisions = recorded
    try {
      return { result: run(), decisions: recorded }
    } finally {
      decisions = null
    }
  }
  return { wrapGuard, track }
}
