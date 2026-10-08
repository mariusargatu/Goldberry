import { cents, facts, type FactsOf, group } from '../factSpec.ts'
import { PRICE_SUMMARY, PRICE_SUMMARY_COPY } from './priceSummaryLocators.ts'

const amount = (row: string) =>
  cents(`${row} ${PRICE_SUMMARY.amount}`, PRICE_SUMMARY_COPY.free)

export const PRICE_SUMMARY_FACTS = facts(PRICE_SUMMARY.main, {
  prices: group(PRICE_SUMMARY.summary, {
    subtotal: amount(PRICE_SUMMARY.rows.subtotal),
    shipping: amount(PRICE_SUMMARY.rows.shipping),
    tax: amount(PRICE_SUMMARY.rows.tax),
    total: amount(PRICE_SUMMARY.rows.total),
  }),
})

export type PriceSummaryFacts = FactsOf<typeof PRICE_SUMMARY_FACTS>

export interface SummaryCents {
  readonly subtotal: number
  readonly shipping: number
  readonly tax: number
  readonly total: number
}

/** The bill, when a summary shows and every amount reads. */
export const summaryOf = (
  prices: PriceSummaryFacts['prices'] | undefined,
): SummaryCents | null =>
  prices !== null &&
  prices !== undefined &&
  Object.values(prices).every((cents) => cents !== null)
    ? (prices as SummaryCents)
    : null

/** The bill adds up. */
export const totalsAddUp = (bill: SummaryCents): boolean =>
  bill.total === bill.subtotal + bill.shipping + bill.tax
