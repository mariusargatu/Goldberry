import type { Page } from '@playwright/test'
import { readDeclared } from './common/readDeclared.ts'
import { SHOP_FACTS, type ShopFacts } from './shopFacts.ts'

// page.evaluate sends a function as its source, without what it imports: the
// interpreter goes as source, the declarations as JSON. One round trip.
const SOURCE = `(${readDeclared.toString()})(window, ...${JSON.stringify(SHOP_FACTS)})`

const NAVIGATING =
  /Execution context was destroyed|Cannot find context with specified id/

/** What the page shows now, or null while it is between documents. */
export async function readFacts(
  page: Pick<Page, 'evaluate'>,
): Promise<ShopFacts | null> {
  try {
    return (await page.evaluate(SOURCE)) as ShopFacts
  } catch (error) {
    if (error instanceof Error && NAVIGATING.test(error.message)) return null
    throw error
  }
}
