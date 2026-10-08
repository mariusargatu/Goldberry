import type { Cell, JSON } from '@antithesishq/bombadil'
import { extract } from '@antithesishq/bombadil/browser'
import { brokenText, consoleErrors } from '../../core/pageHealth.ts'
import { CHANNEL_KEY, type ModelChannel } from '../../core/protocol.ts'
import { readShop, type ShopFacts } from '../../pages/shopFacts.ts'

interface PageHealthFacts {
  readonly consoleErrors: readonly string[]
  readonly renderingSlips: readonly string[]
}

const named = <T>(name: string, cell: Cell<JSON>): Cell<T> =>
  (cell as unknown as { named(name: string): Cell<T> }).named(name)

export const model = named<ModelChannel | null>(
  'model',
  extract((state): JSON => {
    try {
      return JSON.parse(
        state.window.sessionStorage.getItem(CHANNEL_KEY) ?? 'null',
      ) as JSON
    } catch {
      return null
    }
  }),
)

export const pageHealth = named<PageHealthFacts>(
  'pageHealth',
  extract((state): JSON => {
    const body = state.document.body
    return {
      consoleErrors: consoleErrors(state.console),
      renderingSlips: body === null ? [] : brokenText(body.innerText),
    }
  }),
)

/** Everything the pages show, read by the same readers the runner uses. */
export const shop = named<ShopFacts>(
  'shop',
  extract((state): JSON => readShop(state.window) as unknown as JSON),
)
