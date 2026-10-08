import { PRICING, pieceById } from './fixtures.ts'

export interface BagLine {
  readonly pieceId: string
  readonly quantity: number
}

export interface Prices {
  readonly subtotal: number
  readonly shipping: number
  readonly tax: number
  readonly total: number
}

export function priceBag(bag: readonly BagLine[]): Prices {
  const subtotal = bag.reduce(
    (sum, line) => sum + pieceById(line.pieceId).priceCents * line.quantity,
    0,
  )
  const shipping =
    subtotal >= PRICING.freeShippingFromCents ? 0 : PRICING.shippingCents
  const tax = Math.round((subtotal * PRICING.taxPerMille) / 1000)
  return { subtotal, shipping, tax, total: subtotal + shipping + tax }
}
