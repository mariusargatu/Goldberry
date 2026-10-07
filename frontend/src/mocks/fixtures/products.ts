import type { Product } from '../../api'
import { usd } from '../pricing'
import { toyArtUrl, type ToyArt } from './product-art'

/** A catalog product as the mock backend holds it. */
export type ProductFixture = Product

type ProductSeed = Omit<ProductFixture, 'price' | 'image' | 'gallery'> & {
  priceCents: number
  art: ToyArt
  /** Background for the second gallery image. */
  studioBackground: string
}

function toFixture({
  priceCents,
  art,
  studioBackground,
  ...product
}: ProductSeed): ProductFixture {
  const image = {
    url: toyArtUrl(art),
    alt: `${product.name}, ${product.material.toLowerCase()} figure by ${product.artist}`,
  }
  return {
    ...product,
    price: usd(priceCents),
    image,
    gallery: [
      image,
      {
        url: toyArtUrl({ ...art, background: studioBackground }, true),
        alt: `${product.name}, studio view`,
      },
    ],
  }
}

const SEEDS: readonly ProductSeed[] = [
  {
    id: 'kaiju-01-obsidian',
    name: 'Kaiju-01 Obsidian',
    artist: 'Mika Arden',
    priceCents: 18_900,
    stock: 12,
    editionSize: 250,
    material: 'Matte cast vinyl',
    heightCm: 21.5,
    description:
      'A faceted kaiju in obsidian-black matte vinyl, hand-finished and numbered on the base.',
    art: {
      background: '#e7eefe',
      body: '#1c1b1b',
      accent: '#fdc356',
      figure: 'kaiju',
    },
    studioBackground: '#d3daea',
  },
  {
    id: 'ceramic-ghost-no-3',
    name: 'Ceramic Ghost No. 3',
    artist: 'Theo Lindqvist',
    priceCents: 42_000,
    stock: 1,
    editionSize: 25,
    material: 'Glazed porcelain',
    heightCm: 18,
    description:
      'Slip-cast porcelain with a pooled celadon glaze. Each ghost leans a little differently.',
    art: {
      background: '#d9e5df',
      body: '#f7f8f4',
      accent: '#8fbfaa',
      figure: 'ghost',
    },
    studioBackground: '#dce2f3',
  },
  {
    id: 'neon-oni',
    name: 'Neon Oni',
    artist: 'Mika Arden',
    priceCents: 14_500,
    stock: 7,
    editionSize: 150,
    material: 'Translucent vinyl',
    heightCm: 19,
    description:
      'A translucent magenta oni with UV-reactive horns and a hand-painted grin.',
    art: {
      background: '#151c27',
      body: '#d6457a',
      accent: '#fdc356',
      figure: 'oni',
    },
    studioBackground: '#2a313d',
  },
  {
    id: 'gilded-rabbit',
    name: 'Gilded Rabbit',
    artist: 'Theo Lindqvist',
    priceCents: 65_000,
    stock: 3,
    editionSize: 50,
    material: 'Resin with gold leaf',
    heightCm: 24,
    description:
      'Cold-cast resin finished in 23k gold leaf, shipped in a numbered walnut case.',
    art: {
      background: '#1c1b1b',
      body: '#f6bd51',
      accent: '#7d5800',
      figure: 'rabbit',
    },
    studioBackground: '#474646',
  },
]

export const PRODUCTS: readonly ProductFixture[] = SEEDS.map(toFixture)
