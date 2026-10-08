export const PRICE_SUMMARY = {
  main: 'main',
  summary: '[data-testid="price-summary"]',
  /** Each row holds its term (dt) and its amount (dd). */
  rows: {
    subtotal: '[data-testid="price-subtotal"]',
    shipping: '[data-testid="price-shipping"]',
    tax: '[data-testid="price-tax"]',
    total: '[data-testid="price-total"]',
  },
  term: 'dt',
  amount: 'dd',
} as const

export type PriceRow = keyof typeof PRICE_SUMMARY.rows

/** The summary's words. Plain strings only: they cross into the page as JSON. */
export const PRICE_SUMMARY_COPY = {
  subtotal: 'Subtotal',
  tax: 'Tax',
  total: 'Total',
  free: 'Free',
} as const
