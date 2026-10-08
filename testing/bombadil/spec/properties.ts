import { always } from '@antithesishq/bombadil'
import {
  summaryOf,
  totalsAddUp as billAddsUp,
} from '../../pages/common/priceSummary/priceSummaryFacts.ts'
import { model, pageHealth, shop } from './extractors.ts'

/** The last step landed where the model predicted, on a page it knows, and passed its checks. */
export const modelHolds = always(() => model.current?.verdict?.ok !== false)

/** No console errors; failed requests are left to noHttpErrorCodes. */
export const noConsoleErrors = always(
  () => (pageHealth.current?.consoleErrors.length ?? 0) === 0,
)

/** No "NaN", "undefined" or "[object Object]" on screen, as written or in capitals. */
export const noRenderingSlips = always(
  () => (pageHealth.current?.renderingSlips.length ?? 0) === 0,
)

/** Wherever a price summary shows, the bill adds up. */
export const totalsAddUp = always(() => {
  const bill = summaryOf(shop.current?.prices)
  return bill === null || billAddsUp(bill)
})
