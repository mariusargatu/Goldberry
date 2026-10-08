const SLIP =
  /\b(?:NaN|NAN|undefined|UNDEFINED)\b|\[object Object\]|\[OBJECT OBJECT\]/g
const CONTEXT = 6

export function brokenText(text: string): string[] {
  return text.split('\n').flatMap((line) =>
    [...line.matchAll(SLIP)].map((match) => {
      const start = Math.max(0, match.index - CONTEXT)
      return line.slice(start, match.index + match[0].length + CONTEXT).trim()
    }),
  )
}

export interface ConsoleLine {
  readonly level: string
  readonly args: readonly unknown[]
}

const FAILED_REQUEST = /^Failed to load resource:/

export function consoleErrors(entries: readonly ConsoleLine[]): string[] {
  return entries
    .filter((entry) => entry.level === 'error')
    .map((entry) =>
      entry.args
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' '),
    )
    .filter((line) => !FAILED_REQUEST.test(line))
}
