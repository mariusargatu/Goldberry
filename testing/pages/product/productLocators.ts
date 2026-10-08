// A piece's page. Pure: Bombadil bundles it.

export const PRODUCT = {
  main: 'main',
  add: '[data-testid="add-to-bag"]',
  /** The link that replaces Add once the piece is in the bag. */
  viewBag: '[data-testid="view-bag"]',
} as const

/** Only the model opens these; Bombadil's loose clicks keep off them. */
export const PRODUCT_DOORS: readonly string[] = [PRODUCT.add, PRODUCT.viewBag]

/** The page's words. Plain strings only: they cross into the page as JSON. */
export const PRODUCT_COPY = {
  addToBag: 'Add to bag',
  soldOut: 'Sold out',
  added: 'Added to bag',
  already: 'Already added',
  inStock: 'In stock',
} as const

export const viewBagName = (justAdded: boolean): string =>
  `${justAdded ? PRODUCT_COPY.added : PRODUCT_COPY.already}, View bag`

export const onlyLeft = (stock: number): string => `Only ${stock} left`
