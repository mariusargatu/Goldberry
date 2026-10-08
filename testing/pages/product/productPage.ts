import { expect } from '@playwright/test'
import { BasePage } from '../common/basePage.ts'
import { PRODUCT, PRODUCT_COPY, viewBagName } from './productLocators.ts'

export interface ShownPiece {
  readonly name: string
  readonly artist: string
  readonly price: string
  readonly editionSize: number
}

export class ProductPage extends BasePage {
  readonly add = this.main.locator(PRODUCT.add)
  readonly viewBagLink = this.main.locator(PRODUCT.viewBag)

  async addToBag(): Promise<void> {
    await this.add.click()
  }

  async viewBag(): Promise<void> {
    await this.viewBagLink.click()
  }

  async expectPiece(piece: ShownPiece): Promise<void> {
    await this.expectHeading(piece.name, `the page names ${piece.name}`)
    await expect(this.main, `by ${piece.artist}`).toContainText(
      `by ${piece.artist}`,
    )
    await expect(this.main, piece.price).toContainText(piece.price)
    const edition = `Edition of ${piece.editionSize}`
    await expect(this.main, edition).toContainText(edition)
  }

  async expectStock(line: string): Promise<void> {
    await expect(this.main, line).toContainText(line)
  }

  async expectAddable(): Promise<void> {
    await expect(this.add, 'the piece can be added').toBeEnabled()
    await expect(
      this.add,
      `the control reads "${PRODUCT_COPY.addToBag}"`,
    ).toHaveAccessibleName(PRODUCT_COPY.addToBag)
  }

  async expectSoldOut(): Promise<void> {
    await expect(this.add, 'Sold out, disabled').toBeDisabled()
    await expect(
      this.add,
      `the control reads "${PRODUCT_COPY.soldOut}"`,
    ).toHaveAccessibleName(PRODUCT_COPY.soldOut)
  }

  async expectInBag(justAdded: boolean): Promise<void> {
    const name = viewBagName(justAdded)
    await expect(this.add, 'no add control once in the bag').toHaveCount(0)
    await expect(
      this.viewBagLink,
      `the link reads "${name}"`,
    ).toHaveAccessibleName(name)
  }
}
