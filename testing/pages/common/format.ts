// How the shop writes amounts and counts. Pure: Bombadil bundles it.

export const dollars = (cents: number): string =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const items = (count: number): string =>
  `${count} item${count === 1 ? '' : 's'}`
