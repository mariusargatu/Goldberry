import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderCase } from '../core/index.ts'
import type { ExploreResult } from './explore.ts'

const HISTORY_EVENTS = ['BROWSER_BACK', 'BROWSER_RELOAD']
const REPORT_LINES = 40

const tail = (output: string): string =>
  output.trim().split('\n').slice(-REPORT_LINES).join('\n')

function caseFile(result: ExploreResult): string {
  if (result.violations.length === 0) return ''
  const verdict = result.health.violations.at(-1)
  return renderCase(
    {
      violated: result.violations,
      verdict: verdict !== undefined && !verdict.ok ? verdict : null,
      details: tail(result.output),
    },
    HISTORY_EVENTS,
  )
}

export interface RunSetup {
  readonly mode: 'runner' | 'plain'
}

export function writeReport(
  outputPath: string,
  result: ExploreResult,
  setup: RunSetup,
): string {
  const { violations: verdicts, ...health } = result.health
  const { exitCode, violations } = result
  writeFileSync(
    join(outputPath, 'summary.json'),
    `${JSON.stringify({ ...setup, exitCode, violations, ...health, verdicts }, null, 2)}\n`,
  )
  writeFileSync(join(outputPath, 'cases.md'), caseFile(result))
  return [
    `Bombadil exited with ${String(exitCode)}; violated: ${violations.join(', ') || 'none'}`,
    `runner: ${JSON.stringify({ ...health, violations: verdicts.length })}`,
    tail(result.output),
  ].join('\n')
}
