import { expect } from '@playwright/test'
import { BasePage } from '../common/basePage.ts'
import {
  SHIPPING,
  ADDRESS_FIELDS,
  type AddressField,
  SHIPPING_COPY,
} from './shippingLocators.ts'

const FIELDS = Object.entries(ADDRESS_FIELDS) as [AddressField, string][]

export class ShippingPage extends BasePage {
  field(label: string) {
    return this.main.getByLabel(label, { exact: true })
  }

  async submit(address: Readonly<Record<AddressField, string>>) {
    for (const [key, label] of FIELDS)
      await this.field(label).fill(address[key])
    await this.main.locator(SHIPPING.submit).click()
  }

  async expectCheckoutHeading(message: string): Promise<void> {
    await this.expectHeading(SHIPPING_COPY.heading, message)
  }

  async expectEmptyForm(): Promise<void> {
    for (const [, label] of FIELDS)
      await expect(this.field(label), `${label} is empty`).toHaveValue('')
  }
}
