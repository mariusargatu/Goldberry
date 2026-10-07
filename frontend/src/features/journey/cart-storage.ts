import { z } from 'zod'
import { hasBug } from '../../bugs'
import { MAX_LINE_QUANTITY, type Cart } from '../../flows'

const CART_STORAGE_KEY = 'goldberry.cart'

const CartSchema = z.array(
  z.object({
    productId: z.string(),
    name: z.string(),
    artist: z.string(),
    unitPrice: z.object({
      amount: z.number().int().min(0),
      currency: z.literal('USD'),
    }),
    image: z.object({ url: z.string(), alt: z.string() }),
    stock: z.number().int().min(0),
    quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
  }),
)

/** Reads the saved bag; anything missing or malformed yields an empty bag. */
export function loadCart(): Cart {
  if (hasBug('reload-forgets-bag')) return []
  try {
    const parsed = CartSchema.safeParse(
      JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]'),
    )
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

export function saveCart(cart: Cart): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  } catch {
    // Storage unavailable (private mode, quota): the bag lasts for this page load.
  }
}
