// The home page. Pure: Bombadil bundles it.

/** A featured card: a link to its piece. */
export const pieceLink = (pieceId: string): string =>
  `[data-testid="product-card"][href="/product/${pieceId}"]`

/**
 * The home page has no doors: the model follows a piece link, but a loose
 * click on one only moves the browser, and the model reads where it went.
 */
export const HOME_DOORS: readonly string[] = []

export const HOME_COPY = {
  featured: 'Featured editions',
  soldOut: 'Sold out ',
} as const

export interface FeaturedCard {
  readonly name: string
  readonly artist: string
  readonly price: string
  readonly editionSize: number
  readonly soldOut: boolean
}

/** A featured card's accessible name: "Sold out Neon Oni Mika Arden $145.00 Edition of 150". */
export const featuredCardName = (card: FeaturedCard): string =>
  `${card.soldOut ? HOME_COPY.soldOut : ''}${card.name} ${card.artist} ${card.price} Edition of ${card.editionSize}`
