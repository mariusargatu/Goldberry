import type { JSON } from '@antithesishq/bombadil'
import { registerCustomAction } from '@antithesishq/bombadil/browser'
import { BRIDGE, CHANNEL_KEY } from '../../core/protocol.ts'

type Bridge = (operation: string, args: JSON[]) => Promise<void>

async function handOver(
  window: Window,
  operation: string,
  args: JSON[],
): Promise<void> {
  const raw = window.sessionStorage.getItem(CHANNEL_KEY)
  const channel = raw === null ? {} : (JSON.parse(raw) as object)
  window.sessionStorage.setItem(
    CHANNEL_KEY,
    JSON.stringify({ ...channel, busy: operation }),
  )
  const bridge = (window as unknown as Record<string, Bridge | undefined>)[
    BRIDGE
  ]
  if (bridge === undefined)
    throw new Error(
      `${BRIDGE} is not exposed: run this spec through bombadil/exploration.spec.ts`,
    )
  await bridge(operation, args)
}

export const modelEvent = registerCustomAction(
  'modelEvent',
  async (_document, window, type: string, data: JSON) =>
    handOver(window, 'modelEvent', [{ type, data }]),
)

export const resync = registerCustomAction(
  'resync',
  async (_document, window) => handOver(window, 'resync', []),
)

export const settle = registerCustomAction(
  'settle',
  async (_document, window) => handOver(window, 'settle', []),
)
