export interface Piece {
  readonly id: string
  readonly name: string
  readonly artist: string
  readonly priceCents: number
  readonly stock: number
  readonly editionSize: number
}

export const CATALOG: readonly Piece[] = Object.freeze([
  {
    id: 'kaiju-01-obsidian',
    name: 'Kaiju-01 Obsidian',
    artist: 'Mika Arden',
    priceCents: 18900,
    stock: 12,
    editionSize: 250,
  },
  {
    id: 'ceramic-ghost-no-3',
    name: 'Ceramic Ghost No. 3',
    artist: 'Theo Lindqvist',
    priceCents: 42000,
    stock: 1,
    editionSize: 25,
  },
  {
    id: 'neon-oni',
    name: 'Neon Oni',
    artist: 'Mika Arden',
    priceCents: 14500,
    stock: 7,
    editionSize: 150,
  },
  {
    id: 'gilded-rabbit',
    name: 'Gilded Rabbit',
    artist: 'Theo Lindqvist',
    priceCents: 65000,
    stock: 3,
    editionSize: 50,
  },
])

/** The mock server's stock on a fresh page load. */
export const initialStock = (): Record<string, number> =>
  Object.fromEntries(CATALOG.map((piece) => [piece.id, piece.stock]))

export function pieceById(id: string): Piece {
  const piece = CATALOG.find((candidate) => candidate.id === id)
  if (piece === undefined) throw new Error(`no piece "${id}" in the catalog`)
  return piece
}

export const LOW_STOCK = 3

export interface Address {
  readonly fullName: string
  readonly line1: string
  readonly city: string
  readonly region: string
  readonly postalCode: string
}

/** The address the model sends: any complete one moves to payment. */
export const ADDRESS: Address = Object.freeze({
  fullName: 'Ada Lovelace',
  line1: '1 Analytical Way',
  city: 'Portland',
  region: 'OR',
  postalCode: '97201',
})

/** The card the model pays with: any valid card is approved. */
export const CARD = Object.freeze({
  number: '4242 4242 4242 4242',
  expiry: '12 / 30',
  cvc: '123',
  name: 'Ada Lovelace',
})

export const PRICING = Object.freeze({
  shippingCents: 1500,
  freeShippingFromCents: 15000,
  taxPerMille: 75,
})
export const SHIPPING_LABEL = 'Express Insured Courier'
