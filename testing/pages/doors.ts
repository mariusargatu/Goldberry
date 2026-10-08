// What Bombadil's loose actions may never touch: every page's doors (only
// the model opens them) and the frame's off-limits elements. Pure: Bombadil
// bundles it.
import { BAG_DOORS } from './bag/bagLocators.ts'
import { LAYOUT_OFF_LIMITS } from './common/layout/layoutLocators.ts'
import { HOME_DOORS } from './home/homeLocators.ts'
import { PAYMENT_DOORS } from './payment/paymentLocators.ts'
import { PRODUCT_DOORS } from './product/productLocators.ts'
import { SHIPPING_DOORS } from './shipping/shippingLocators.ts'

export const OFF_LIMITS: readonly string[] = [
  ...HOME_DOORS,
  ...PRODUCT_DOORS,
  ...BAG_DOORS,
  ...SHIPPING_DOORS,
  ...PAYMENT_DOORS,
  ...LAYOUT_OFF_LIMITS,
]
