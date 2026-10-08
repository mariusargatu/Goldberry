import type { Snapshot } from '../../core/index.ts'
import type { ShopPages } from '../../pages/index.ts'
import { ADDRESS, CARD } from '../model/fixtures.ts'
import { pieceOfLink } from '../model/landing.ts'
import type { LinkName, ShopEvent } from '../model/shop.types.ts'

type Door<K extends ShopEvent['type']> = (
  event: Extract<ShopEvent, { type: K }>,
  snapshot: Snapshot,
) => Promise<void>

export type Doors = { readonly [K in ShopEvent['type']]?: Door<K> }

export function shopDoors(pages: ShopPages): Doors {
  function followLink(link: LinkName): Promise<void> {
    switch (link) {
      case 'view-bag':
        return pages.product.viewBag()
      case 'check-out':
        return pages.bag.checkOut()
      default:
        return pages.home.openPiece(pieceOfLink(link))
    }
  }

  return {
    FOLLOW_LINK: (event) => followLink(event.data),
    ADD_TO_BAG: () => pages.product.addToBag(),
    SUBMIT_SHIPPING: () => pages.shipping.submit(ADDRESS),
    PLACE_ORDER: () => pages.payment.pay(CARD),
    BROWSER_BACK: () => pages.navigation.back(),
    BROWSER_RELOAD: () => pages.navigation.reload(),
  }
}
