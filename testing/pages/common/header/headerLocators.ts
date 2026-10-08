// The site header. Pure: Bombadil bundles it.

import { items } from '../format.ts'

export const HEADER = {
  bagLink: '[data-testid="header-bag"]',
} as const

/** The header's bag link, named by its count: "Bag, 2 items". */
export const bagLinkName = (count: number): string => `Bag, ${items(count)}`
