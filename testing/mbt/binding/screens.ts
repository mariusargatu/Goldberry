// States ↔ screens: which page view each resting state is, read from the
// page's facts. The only map from the model's state names to the pages'.
import type { AnyStateNode } from 'xstate'
import type { Probe } from '../../core/index.ts'
import { bagViews } from '../../pages/bag/bagFacts.ts'
import { homeViews } from '../../pages/home/homeFacts.ts'
import { paymentViews } from '../../pages/payment/paymentFacts.ts'
import { productViews } from '../../pages/product/productFacts.ts'
import { receiptViews } from '../../pages/receipt/receiptFacts.ts'
import { shippingViews } from '../../pages/shipping/shippingFacts.ts'
import type { ShopFacts } from '../../pages/shopFacts.ts'
import { type Family, familyOf } from '../model/landing.ts'
import type { ShopMachine } from '../model/shop.machine.ts'
import type { ShopContext } from '../model/shop.types.ts'

// Each screen needs its page's URL first, so no two pages can match the same
// facts; then what the page must show once it has settled.
const at =
  (family: Family, shows: (facts: ShopFacts) => boolean) =>
  (facts: ShopFacts): boolean =>
    familyOf(facts.url) === family && shows(facts)

const SCREENS: Readonly<Record<string, (facts: ShopFacts) => boolean>> = {
  'home.ready': at('home', homeViews.ready),
  'product.available': at('product', productViews.available),
  'product.soldOut': at('product', productViews.soldOut),
  'product.inBag': at('product', productViews.inBag),
  'bag.empty': at('bag', bagViews.empty),
  'bag.filled': at('bag', bagViews.filled),
  'checkout.shipping': at('checkout', shippingViews.editing),
  'checkout.payment': at('checkout', paymentViews.paying),
  'receipt.ready': at('receipt', receiptViews.ready),
}

/** What a state's page tells the model beyond where it is. */
const READERS: Readonly<
  Record<string, (facts: ShopFacts) => Partial<ShopContext>>
> = {
  'product.inBag': (facts) =>
    facts.addedLink === null ? {} : { justAdded: facts.addedLink === 'added' },
}

export const stateNodes = (node: AnyStateNode): AnyStateNode[] => [
  node,
  ...Object.values(node.states).flatMap(stateNodes),
]

export const isResting = (node: AnyStateNode): boolean =>
  node.type === 'atomic' && node.meta?.transient !== true

/** A probe per state: its screen, or any of its resting children's. */
export function screenProbes(
  machine: ShopMachine,
): Record<string, Probe<ShopFacts, ShopContext>> {
  const resting = stateNodes(machine.root)
    .filter(isResting)
    .map((node) => node.path.join('.'))
  const unseen = resting.filter((path) => !Object.hasOwn(SCREENS, path))
  if (unseen.length > 0)
    throw new Error(`no screen recognises ${unseen.join(', ')}`)
  const stale = Object.keys(SCREENS).filter((path) => !resting.includes(path))
  if (stale.length > 0)
    throw new Error(`screens for states the model lacks: ${stale.join(', ')}`)
  const entries = stateNodes(machine.root)
    .slice(1)
    .flatMap((node): [string, Probe<ShopFacts, ShopContext>][] => {
      const screens = stateNodes(node)
        .filter(isResting)
        .flatMap((leaf) => SCREENS[leaf.path.join('.')] ?? [])
      if (screens.length === 0) return []
      const path = node.path.join('.')
      const read = READERS[path]
      const probe: Probe<ShopFacts, ShopContext> = {
        matches: (facts) => screens.some((screen) => screen(facts)),
        readContext: (facts) => ({
          url: facts.url,
          back: facts.history,
          document: facts.document,
          ...(facts.storedBag !== null && { bag: facts.storedBag }),
          ...read?.(facts),
        }),
      }
      return [[path, probe]]
    })
  return Object.fromEntries(entries)
}
