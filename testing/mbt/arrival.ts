import type { ShopFacts } from '../pages/shopFacts.ts'
import { initialStock } from './model/fixtures.ts'
import { familyOf, ORDER_UUID, orderOf, samePath } from './model/landing.ts'
import type { ShopContext, ShopEvent } from './model/shop.types.ts'

const isFreshLoad = (facts: ShopFacts, context: ShopContext): boolean =>
  context.document !== null && facts.document !== context.document

const isPageTheModelKnows = (url: string): boolean => familyOf(url) !== null

export function arrivalEvent(
  facts: ShopFacts,
  context: ShopContext,
): ShopEvent | null {
  const fresh = isFreshLoad(facts, context)
  const moved = fresh || !samePath(context.url, facts.url)
  if (!moved || !isPageTheModelKnows(facts.url)) return null
  return {
    type: 'ARRIVE',
    data: {
      url: facts.url,
      back: facts.history,
      bag: facts.storedBag ?? context.bag,
      fresh,
    },
  }
}

const freshStock = (
  facts: ShopFacts,
  context: ShopContext,
): Partial<ShopContext> =>
  isFreshLoad(facts, context) ? { stock: initialStock() } : {}

function namedReceipt(
  facts: ShopFacts,
  context: ShopContext,
): Partial<ShopContext> {
  const index = orderOf(context.url)
  const unnamed =
    index !== null &&
    ORDER_UUID.test(facts.url) &&
    context.orders[index]?.path === null
  if (!unnamed) return {}
  return {
    orders: context.orders.map((order, at) =>
      at === index ? { ...order, path: facts.url } : order,
    ),
  }
}

export function observedContext(
  facts: ShopFacts,
  context: ShopContext,
): Partial<ShopContext> {
  return {
    document: facts.document,
    ...freshStock(facts, context),
    ...namedReceipt(facts, context),
  }
}
