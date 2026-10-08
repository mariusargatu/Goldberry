import type { Verdict } from '../protocol.ts'

/** A move's line in the journey: where it started, where it ended, or why it failed. */
export function outcomeOf(
  verdict: Verdict,
  from: string | null,
  state: string,
  lost: boolean,
): string {
  if (verdict.ok && from === null)
    return lost ? 'could not re-anchor (model lost)' : `re-anchored on ${state}`
  if (verdict.ok) return `${from} → ${state}`
  const start = from ?? 're-anchor'
  switch (verdict.kind) {
    case 'unexpected-state':
      return `${start} → expected ${(verdict.expected ?? []).join(' or ')}, page showed ${verdict.observed}`
    case 'assertion':
      return `${start} → ${state}, a check failed`
    case 'handler':
      return `${start}: the page-object step failed`
    case 'unrecognised':
      return `${start} → a page no state matches (${verdict.observed})`
  }
}
