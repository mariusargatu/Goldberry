// The checkout's shipping step. Pure: Bombadil bundles it.

export const SHIPPING = {
  submit: '[data-testid="submit-shipping"]',
} as const

/** Only the model opens these; Bombadil's loose clicks keep off them. */
export const SHIPPING_DOORS: readonly string[] = [SHIPPING.submit]

export const SHIPPING_COPY = {
  heading: 'Checkout',
  section: 'Shipping address',
} as const

/** The address form's fields, by their labels. */
export const ADDRESS_FIELDS = {
  fullName: 'Full name',
  line1: 'Address',
  city: 'City',
  region: 'State',
  postalCode: 'ZIP code',
} as const

export type AddressField = keyof typeof ADDRESS_FIELDS
