import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { arch, platform } from 'node:os'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import {
  ANSI_STYLE,
  BRIDGE,
  type ModelEvent,
  type ModelRunner,
  type RunnerHealth,
} from '../core/index.ts'

const PLATFORM = `${platform()}-${arch()}`
const BINARY = fileURLToPath(
  new URL(
    `../node_modules/@antithesishq/bombadil/binaries/bombadil-${PLATFORM}`,
    import.meta.url,
  ),
)
const SPEC = fileURLToPath(new URL('./spec/goldberry.spec.ts', import.meta.url))

interface ExploreOptions {
  readonly page: Page
  readonly cdpPort: number
  readonly origin: string
  readonly outputPath: string
  readonly runner: ModelRunner
  readonly timeLimit: string
  readonly pauseMs?: number
}

export interface ExploreResult {
  readonly exitCode: number | null
  readonly output: string
  readonly violations: readonly string[]
  readonly health: RunnerHealth
}

function runBombadil(
  options: ExploreOptions,
): Promise<{ exitCode: number | null; output: string }> {
  if (!existsSync(BINARY))
    throw new Error(
      `Bombadil has no binary for ${PLATFORM} (it ships macOS arm64 and Linux). On Intel macOS or Windows, run the exploration in Docker or WSL.`,
    )
  const viewport = options.page.viewportSize()
  const args = [
    'browser',
    'test-external',
    '--remote-debugger',
    `http://127.0.0.1:${options.cdpPort}`,
    options.origin,
    SPEC,
    '--output-path',
    options.outputPath,
    '--output-path-overwrite',
    '--time-limit',
    options.timeLimit,
    '--width',
    String(viewport?.width ?? 1280),
    '--height',
    String(viewport?.height ?? 800),
    '--exit-on-violation',
  ]
  return new Promise((resolve, reject) => {
    const child = spawn(BINARY, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const chunks: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk))
    child.on('error', reject)
    child.on('close', (exitCode) =>
      resolve({
        exitCode,
        output: Buffer.concat(chunks).toString('utf8').replace(ANSI_STYLE, ''),
      }),
    )
  })
}

/** What Bombadil's custom actions (spec/actions.ts) ask the runner to do. */
const OPERATIONS: Readonly<
  Record<
    string,
    (runner: ModelRunner, args: readonly unknown[]) => Promise<void>
  >
> = {
  modelEvent: (runner, [event]) => runner.modelEvent(event as ModelEvent),
  resync: (runner) => runner.resync(),
  settle: (runner) => runner.settle(),
}

/**
 * Runs tasks one at a time, in the order they arrive: Bombadil may call the
 * bridge again before the runner has finished. A failed task does not stop
 * the ones after it.
 */
function oneAtATime() {
  let last: Promise<unknown> = Promise.resolve()
  return {
    run<T>(task: () => Promise<T>): Promise<T> {
      const result = last.then(task)
      last = result.catch(() => undefined)
      return result
    },
    /** Waits for the task in flight, if any. */
    idle: (): Promise<unknown> => last,
  }
}

const violationsIn = (output: string): string[] => [
  ...new Set(
    [...output.matchAll(/^(\w+) was violated:/gm)].map(
      (match) => match[1] ?? '',
    ),
  ),
]

export async function explore(options: ExploreOptions): Promise<ExploreResult> {
  const { runner } = options
  const queue = oneAtATime()
  await options.page
    .context()
    .exposeFunction(BRIDGE, (operation: string, args: unknown[]) =>
      queue.run(async () => {
        const perform = OPERATIONS[operation]
        if (perform === undefined)
          throw new Error(`the bridge has no operation "${operation}"`)
        await perform(runner, args)
        await sleep(options.pauseMs ?? 0)
      }),
    )
  await runner.start()
  const { exitCode, output } = await runBombadil(options)
  await queue.idle()
  mkdirSync(options.outputPath, { recursive: true })
  writeFileSync(join(options.outputPath, 'bombadil.log'), output)
  return {
    exitCode,
    output,
    violations: violationsIn(output),
    health: runner.health(),
  }
}
