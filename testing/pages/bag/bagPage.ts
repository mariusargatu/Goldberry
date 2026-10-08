import { expect } from '@playwright/test'
import { BasePage } from '../common/basePage.ts'
import { BAG, BAG_COPY, subtotalLabel } from './bagLocators.ts'

export interface ShownBagLine {
  readonly name: string
  readonly quantity: number
  readonly unit: string
  readonly total: string
}

const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export class BagPage extends BasePage {
  readonly checkOutLink = this.main.locator(BAG.checkOut)

  line(pieceName: string) {
    return this.main.locator(BAG.line).filter({
      has: this.page.locator(BAG.piece).getByText(pieceName, { exact: true }),
    })
  }

  async checkOut(): Promise<void> {
    await this.checkOutLink.click()
  }

  async expectBagHeading(): Promise<void> {
    await this.expectHeading(BAG_COPY.heading, 'the bag page')
  }

  async expectEmpty(): Promise<void> {
    await expect(
      this.main.getByRole('heading', { name: BAG_COPY.empty }),
      'an empty bag says so',
    ).toBeVisible()
  }

  async expectLine(line: ShownBagLine): Promise<void> {
    const row = this.line(line.name)
    await expect(
      row.locator(BAG.quantity),
      `${line.name} × ${line.quantity}`,
    ).toHaveText(String(line.quantity))
    await expect(
      row,
      `${line.name} at ${line.unit} each, ${line.total}`,
    ).toHaveText(
      new RegExp(
        `${escapeRegExp(line.unit)} each\\s*${escapeRegExp(line.total)}`,
      ),
    )
  }

  async expectSubtotal(count: number, amount: string) {
    const label = subtotalLabel(count)
    const subtotal = this.main.locator(BAG.subtotal)
    await expect(subtotal, `${label} ${amount}`).toContainText(label)
    await expect(subtotal, `${label} ${amount}`).toContainText(amount)
  }

  async expectCheckOut(): Promise<void> {
    await expect(this.checkOutLink, `${BAG_COPY.checkOut}`).toHaveText(
      BAG_COPY.checkOut,
    )
  }
}
