import { expect } from '@playwright/test'
import { BasePage } from '../common/basePage.ts'
import { RECEIPT_COPY, shipsWith } from './receiptLocators.ts'

export class ReceiptPage extends BasePage {
  async expectConfirmed(): Promise<void> {
    await this.expectHeading(RECEIPT_COPY.heading, 'the order is confirmed')
  }

  async expectShipsWith(courier: string): Promise<void> {
    await expect(
      this.main.getByText(/^Order GB-\d{6} ships/),
      'the order number and courier',
    ).toHaveText(shipsWith(courier))
  }

  async expectContinueShopping(): Promise<void> {
    await expect(
      this.main.getByRole('link', { name: RECEIPT_COPY.continueShopping }),
      `${RECEIPT_COPY.continueShopping}`,
    ).toHaveAttribute('href', '/')
  }
}
