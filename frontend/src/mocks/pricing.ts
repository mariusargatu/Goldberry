import type { Money, Quote } from '../api'
import type { ResolvedLine } from './store'

/** Pricing rules for the mock backend. Amounts are in cents. */
const TAX_RATE = 0.075
const FREE_SHIPPING_THRESHOLD = 15_000
const SHIPPING_COST = 1_500
const SHIPPING_ETA_DAYS = 2

export function usd(amount: number): Money {
  return { amount, currency: 'USD' }
}

/** Prices a cart. */
export function priceCart(lines: readonly ResolvedLine[]): Quote {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price.amount * line.quantity,
    0,
  )
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const tax = Math.round(subtotal * TAX_RATE)

  return {
    subtotal: usd(subtotal),
    shipping: usd(shipping),
    tax: usd(tax),
    total: usd(subtotal + shipping + tax),
    shippingMethod: {
      id: 'express-insured',
      label: 'Express Insured Courier',
      etaDays: SHIPPING_ETA_DAYS,
      cost: usd(shipping),
    },
  }
}
