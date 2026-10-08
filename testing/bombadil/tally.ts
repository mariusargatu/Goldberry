/**
 * Runs every planted bug through the regression and through explorations,
 * plain and judged, and prints the README's results table.
 *
 *   pnpm tally                      # 10 explorations a cell, 4 at a time
 *   TALLY_RUNS=5 TALLY_WORKERS=2 pnpm tally
 *
 * Bombadil is not seeded, so a rerun gives rates like these, not these runs.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const BUGS = [
  'edition-nan',
  'reload-forgets-bag',
  'bag-count-lines',
  '',
] as const
const MODES = ['plain', 'runner'] as const
const RUNS = Number(process.env.TALLY_RUNS ?? 10)
const WORKERS = Number(process.env.TALLY_WORKERS ?? 4)
const OUT = 'test-results/tally'

type Mode = (typeof MODES)[number]

interface Summary {
  readonly violations: readonly string[]
  readonly steps: number
}

function playwright(
  project: string,
  env: Record<string, string>,
  args: string[],
): void {
  spawnSync(
    'pnpm',
    ['exec', 'playwright', 'test', `--project=${project}`, ...args],
    {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, ...env },
    },
  )
}

function regression(bug: string): string {
  const report = join(OUT, `regression-${bug || 'none'}.json`)
  playwright(
    'regression',
    { GOLDBERRY_BUGS: bug, PLAYWRIGHT_JSON_OUTPUT_FILE: report },
    [
      '--reporter=dot,json',
      `--output=${join(OUT, `regression-${bug || 'none'}`)}`,
    ],
  )
  if (!existsSync(report)) return 'did not run'
  const { stats } = JSON.parse(readFileSync(report, 'utf8'))
  return `${stats.unexpected} red, ${stats.expected} green`
}

function summaries(dir: string): Summary[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('summary.json'))
    .map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')))
}

const median = (values: number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0

function exploration(bug: string, mode: Mode): string {
  const dir = join(OUT, `${bug || 'none'}-${mode}`)
  playwright('exploration', { GOLDBERRY_BUGS: bug, EXPLORE_MODE: mode }, [
    `--repeat-each=${RUNS}`,
    `--workers=${WORKERS}`,
    '--reporter=dot',
    `--output=${dir}`,
  ])
  const runs = summaries(dir)
  const caught = runs.filter((run) => run.violations.length > 0)
  if (caught.length === 0) return `0/${runs.length}`
  const properties = [...new Set(caught.flatMap((run) => run.violations))]
  const steps = median(caught.map((run) => run.steps))
  return `${caught.length}/${runs.length}, step ${steps} (${properties.join(', ')})`
}

rmSync(OUT, { recursive: true, force: true })
const rows = BUGS.map((bug) => [
  bug === '' ? 'none (healthy shop)' : `\`${bug}\``,
  regression(bug),
  ...MODES.map((mode) => exploration(bug, mode)),
])
const header = [
  'Bug',
  'Regression (9 paths)',
  'Plain exploration',
  'Judged exploration',
]
const line = (cells: readonly string[]) => `| ${cells.join(' | ')} |`
process.stdout.write(
  [
    '',
    `${RUNS} explorations a cell; "step" is the median step of the first violation.`,
    line(header),
    line(header.map(() => '---')),
    ...rows.map(line),
    '',
  ].join('\n'),
)
