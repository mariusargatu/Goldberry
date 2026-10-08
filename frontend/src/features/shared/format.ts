import type { Money } from '../../api'

const CENTS_PER_UNIT = 100

/** `{ amount: 18900, currency: 'USD' }` → `$189.00` */
export function formatMoney(money: Money): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currency,
  }).format(money.amount / CENTS_PER_UNIT)
}

/** Price of a bag or order line: unit price times quantity. */
export function formatLineTotal(line: {
  unitPrice: Money
  quantity: number
}): string {
  return formatMoney({
    ...line.unitPrice,
    amount: line.unitPrice.amount * line.quantity,
  })
}

/** `plural(1, 'item')` → `1 item`, `plural(3, 'item')` → `3 items` */
export function plural(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`
}
