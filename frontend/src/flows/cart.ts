import {
  apiSchemas,
  type Money,
  type ProductImage,
  type ProductSummary,
} from '../api/contract'

/** A cart line with the product details the cart page needs. */
export type CartLine = {
  productId: string
  name: string
  artist: string
  unitPrice: Money
  image: ProductImage
  /** Stock when the product was last seen; caps the quantity. */
  stock: number
  quantity: number
}

export type Cart = readonly CartLine[]

/** Per-line maximum allowed by the API contract. */
export const MAX_LINE_QUANTITY = apiSchemas.createOrderBodyItemsItemQuantityMax

export function maxQuantityFor(stock: number): number {
  return Math.min(stock, MAX_LINE_QUANTITY)
}

export function quantityInCart(cart: Cart, productId: string): number {
  return cart.find((line) => line.productId === productId)?.quantity ?? 0
}

export function isAllowedQuantity(
  cart: Cart,
  productId: string,
  quantity: number,
): boolean {
  const line = cart.find((candidate) => candidate.productId === productId)
  return (
    line !== undefined &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= maxQuantityFor(line.stock)
  )
}

/** Adds one unit, refreshing the line's price and stock from the product. */
export function addToCart(cart: Cart, product: ProductSummary): Cart {
  const details = {
    productId: product.id,
    name: product.name,
    artist: product.artist,
    unitPrice: product.price,
    image: product.image,
    stock: product.stock,
  }
  const existing = cart.find((line) => line.productId === product.id)
  if (!existing) return [...cart, { ...details, quantity: 1 }]
  return cart.map((line) =>
    line.productId === product.id
      ? { ...details, quantity: line.quantity + 1 }
      : line,
  )
}

export function setQuantity(
  cart: Cart,
  productId: string,
  quantity: number,
): Cart {
  return cart.map((line) =>
    line.productId === productId ? { ...line, quantity } : line,
  )
}

export function removeFromCart(cart: Cart, productId: string): Cart {
  return cart.filter((line) => line.productId !== productId)
}

export function cartCount(cart: Cart): number {
  return cart.reduce((sum, line) => sum + line.quantity, 0)
}

export function cartSubtotal(cart: Cart): Money {
  return {
    amount: cart.reduce(
      (sum, line) => sum + line.unitPrice.amount * line.quantity,
      0,
    ),
    currency: 'USD',
  }
}
