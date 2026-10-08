import { expect } from '@playwright/test'
import { BasePage } from '../basePage.ts'
import { dollars } from '../format.ts'
import {
  PRICE_SUMMARY,
  type PriceRow,
  PRICE_SUMMARY_COPY,
} from './priceSummaryLocators.ts'

/** A bill as the summary must show it, in cents. */
export interface Bill {
  readonly subtotal: number
  readonly shipping: number
  readonly tax: number
  readonly total: number
  readonly shippingLabel: string
}

export class PriceSummaryPage extends BasePage {
  readonly summary = this.main.locator(PRICE_SUMMARY.summary)

  row(name: PriceRow) {
    return this.summary.locator(PRICE_SUMMARY.rows[name])
  }

  /** Every line of the bill shows its term and amount. */
  async expectBill(bill: Bill): Promise<void> {
    const copy = PRICE_SUMMARY_COPY
    const lines: (readonly [PriceRow, string, string])[] = [
      ['subtotal', copy.subtotal, dollars(bill.subtotal)],
      [
        'shipping',
        bill.shippingLabel,
        bill.shipping === 0 ? copy.free : dollars(bill.shipping),
      ],
      ['tax', copy.tax, dollars(bill.tax)],
      ['total', copy.total, dollars(bill.total)],
    ]
    for (const [name, label, amount] of lines) {
      const row = this.row(name)
      const message = `${label} ${amount}`
      await expect(row.locator(PRICE_SUMMARY.term), message).toHaveText(label)
      await expect(row.locator(PRICE_SUMMARY.amount), message).toHaveText(
        amount,
      )
    }
  }
}
