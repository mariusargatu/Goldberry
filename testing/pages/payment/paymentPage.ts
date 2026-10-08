import { expect } from '@playwright/test'
import { BasePage } from '../common/basePage.ts'
import { PAYMENT, PAYMENT_COPY, payButtonName } from './paymentLocators.ts'

export interface Card {
  readonly number: string
  readonly expiry: string
  readonly cvc: string
  readonly name: string
}

export class PaymentPage extends BasePage {
  async pay(card: Card): Promise<void> {
    await this.main.getByLabel(PAYMENT_COPY.cardNumber).fill(card.number)
    await this.main.getByLabel(PAYMENT_COPY.expiry).fill(card.expiry)
    await this.main.getByLabel(PAYMENT_COPY.cvc).fill(card.cvc)
    await this.main.getByLabel(PAYMENT_COPY.nameOnCard).fill(card.name)
    await this.main.locator(PAYMENT.placeOrder).click()
  }

  async expectPayButton(total: string): Promise<void> {
    await expect(
      this.main.getByRole('button', { name: payButtonName(total) }),
      `Pay ${total}`,
    ).toBeVisible()
  }
}
