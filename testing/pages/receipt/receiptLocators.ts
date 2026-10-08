// The receipt. Pure: Bombadil bundles it.

export const RECEIPT_COPY = {
  heading: 'Thank you — your order is confirmed',
  continueShopping: 'Continue shopping',
} as const

/** "Order GB-123456 ships with <courier> within 2 days.", any order number. */
export const shipsWith = (courier: string): RegExp =>
  new RegExp(`^Order GB-\\d{6} ships with ${courier} within 2 days\\.$`)
