import { expect } from '@playwright/test'
import { BasePage } from '../basePage.ts'
import { HEADER, bagLinkName } from './headerLocators.ts'

export class HeaderPage extends BasePage {
  readonly bagLink = this.header.locator(HEADER.bagLink)

  async expectBagCount(count: number, message: string): Promise<void> {
    await expect(this.bagLink, message).toHaveAccessibleName(bagLinkName(count))
  }
}
