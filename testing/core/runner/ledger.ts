import { EVENT_SOURCE, type Relied } from '../protocol.ts'

const INITIAL_SOURCE = "the model's initial context"
const JOURNEY_LENGTH = 20

interface SetNow {
  readonly before: object
  readonly source: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const valueAt = (target: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) => (isRecord(value) ? value[key] : undefined),
      target,
    )

export function leaves(value: unknown, prefix = ''): [string, unknown][] {
  if (!isRecord(value))
    return value === '' ? [] : [[prefix.slice(0, -1), value]]
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, `${prefix}${key}.`),
  )
}

function differences(previous: unknown, next: unknown, prefix = ''): string[] {
  if (previous === next) return []
  if (!isRecord(previous) || !isRecord(next))
    return prefix === '' ? [] : [prefix.slice(0, -1)]
  const keys = [...new Set([...Object.keys(previous), ...Object.keys(next)])]
  return keys.flatMap((key) =>
    differences(previous[key], next[key], `${prefix}${key}.`),
  )
}

/**
 * The model's memory of where each context value came from, so a case file
 * can say "bag.length = 1, from ADD_TO_BAG at step 4", and the journey: the
 * last JOURNEY_LENGTH moves, one line each.
 */
export function createLedger() {
  /** Which move last set each context path. */
  let setBy: Readonly<Record<string, string>> = {}
  let journey: readonly string[] = []

  /** The source of the nearest recorded path at or above `path`. */
  function whoSet(path: string): string {
    const parts = path.split('.')
    const known = parts
      .map((_, index) => setBy[parts.slice(0, parts.length - index).join('.')])
      .find((source) => source !== undefined)
    return known ?? INITIAL_SOURCE
  }

  return {
    /** The context changed from `previous` to `next`: `source` set what differs. */
    changed(previous: object, next: object, source: string): void {
      const paths = differences(previous, next)
      const stillValid = Object.entries(setBy).filter(
        ([known]) =>
          !paths.some((path) => known === path || known.startsWith(`${path}.`)),
      )
      setBy = Object.fromEntries([
        ...stillValid,
        ...paths.map((path) => [path, source] as const),
      ])
    },

    /**
     * Each value read, with where it came from: the event itself, the step
     * being made (when it differs from the context before the step, setNow),
     * or the move that last set it.
     */
    cite(
      read: readonly (readonly [string, unknown])[],
      setNow?: SetNow,
    ): Relied[] {
      const sourceOf = (path: string, value: unknown): string => {
        if (path.startsWith('event.')) return EVENT_SOURCE
        if (setNow !== undefined && valueAt(setNow.before, path) !== value)
          return setNow.source
        return whoSet(path)
      }
      return read.map(([path, value]) => ({
        path,
        value,
        source: sourceOf(path, value),
      }))
    },

    note(entry: string): void {
      journey = [...journey, entry].slice(-JOURNEY_LENGTH)
    },

    journey: (): readonly string[] => journey,
  }
}
