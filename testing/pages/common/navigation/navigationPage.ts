import { BasePage } from '../basePage.ts'

export class NavigationPage extends BasePage {
  async back(): Promise<void> {
    await this.page.goBack()
  }

  async reload(): Promise<void> {
    await this.page.reload()
  }
}
