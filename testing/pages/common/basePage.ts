import { expect, type Locator, type Page } from '@playwright/test'

/** What every page object shares: the page, its main region and header. */
export class BasePage {
  readonly page: Page
  readonly main: Locator
  readonly header: Locator

  constructor(page: Page) {
    this.page = page
    this.main = page.locator('main')
    this.header = page.locator('header')
  }

  /** The browser's path (with its query) is one the caller accepts. */
  async expectPath(
    matches: (path: string) => boolean,
    message: string,
  ): Promise<void> {
    await expect(this.page, message).toHaveURL((url) =>
      matches(url.pathname + url.search),
    )
  }

  /** The page's <h1> reads exactly this. */
  async expectHeading(text: string, message: string): Promise<void> {
    await expect(
      this.main.getByRole('heading', { level: 1 }),
      message,
    ).toHaveText(text)
  }
}
