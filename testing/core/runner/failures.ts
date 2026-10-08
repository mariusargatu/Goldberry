export const ANSI_STYLE = /\u001b\[[0-9;]*m/g
const MAX_LENGTH = 500
const LOCATOR = /^Locator:\s*(.*)$/
const COMPARISON = /^(Expected|Received)( \(\w+\))?:\s*(.*)$/
const NOT_FOUND = /^Error: (element\(s\) not found)$/
const WAITING_FOR = /^- waiting for (.*)$/
const RESOLVED = /^- locator resolved to (.*)$/
const ELEMENT_STATE = /^- (element is not \w+.*)$/

const captures = (lines: readonly string[], pattern: RegExp): string[] =>
  lines.flatMap((line) => {
    const captured = line.match(pattern)?.[1]
    return captured === undefined ? [] : [captured]
  })

function callLog(lines: readonly string[]): string[] {
  const start = lines.indexOf('Call log:')
  if (start < 0) return []
  const log = lines.slice(start + 1)
  const target = captures(log, WAITING_FOR)[0]
  const resolved = captures(log, RESOLVED)[0]
  const state = captures(log, ELEMENT_STATE).at(-1)
  return [
    ...(target === undefined ? [] : [`Locator: ${target}`]),
    ...(state === undefined ? [] : [state]),
    ...(resolved !== undefined
      ? [`resolved to ${resolved}`]
      : target !== undefined
        ? ['no such element']
        : []),
  ]
}

export function describeFailure(error: unknown): string {
  const text = String(error instanceof Error ? error.message : error).replace(
    ANSI_STYLE,
    '',
  )
  const [first = '', ...rest] = text.split('\n')
  const lines = rest.map((line) => line.trim())
  const locator = captures(lines, LOCATOR)[0]
  const comparison = lines.flatMap((line) => {
    const match = line.match(COMPARISON)
    return match === null ? [] : [`${match[1]}: ${match[3]}`]
  })
  const missing = captures(lines, NOT_FOUND)[0]
  const received =
    missing !== undefined &&
    !comparison.some((part) => part.startsWith('Received:'))
      ? [`Received: ${missing}`]
      : []
  const target =
    locator === undefined ? callLog(lines) : [`Locator: ${locator}`]
  return [first.trim(), ...target, ...comparison, ...received]
    .join('; ')
    .slice(0, MAX_LENGTH)
}
