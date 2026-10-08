import { expect } from '@playwright/test'
import { BasePage } from '../common/basePage.ts'
import {
  pieceLink,
  type FeaturedCard,
  featuredCardName,
  HOME_COPY,
} from './homeLocators.ts'

export class HomePage extends BasePage {
  readonly featured = this.main.getByRole('region', {
    name: HOME_COPY.featured,
  })

  async openPiece(pieceId: string): Promise<void> {
    await this.main.locator(pieceLink(pieceId)).first().click()
  }

  async expectFeatured(pieceId: string, card: FeaturedCard): Promise<void> {
    const soldOut = card.soldOut ? HOME_COPY.soldOut : ''
    await expect(
      this.featured.locator(pieceLink(pieceId)),
      `${soldOut}${card.name} is featured with its artist, price and edition`,
    ).toHaveAccessibleName(featuredCardName(card))
  }
}
