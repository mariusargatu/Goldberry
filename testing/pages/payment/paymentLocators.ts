// The checkout's payment step. Pure: Bombadil bundles it.

export const PAYMENT = {
  placeOrder: '[data-testid="place-order"]',
} as const

/** Only the model opens these; Bombadil's loose clicks keep off them. */
export const PAYMENT_DOORS: readonly string[] = [PAYMENT.placeOrder]

export const PAYMENT_COPY = {
  heading: 'Checkout',
  section: 'Credit or debit card',
  cardNumber: 'Card number',
  expiry: 'Expiry',
  cvc: 'CVC',
  nameOnCard: 'Name on card',
} as const

export const payButtonName = (total: string): string =>
  `Pay ${total} & place order`
