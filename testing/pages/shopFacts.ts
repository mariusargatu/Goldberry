import { BAG_FACTS, type BagFacts } from './bag/bagFacts.ts'
import {
  BROWSER_FACTS,
  type BrowserFacts,
} from './common/browser/browserFacts.ts'
import type { FactSpec } from './common/factSpec.ts'
import { LAYOUT_FACTS, type LayoutFacts } from './common/layout/layoutFacts.ts'
import {
  PRICE_SUMMARY_FACTS,
  type PriceSummaryFacts,
} from './common/priceSummary/priceSummaryFacts.ts'
import { readDeclared } from './common/readDeclared.ts'
import { PRODUCT_FACTS, type ProductFacts } from './product/productFacts.ts'

export type ShopFacts = BrowserFacts &
  LayoutFacts &
  ProductFacts &
  BagFacts &
  PriceSummaryFacts

export const SHOP_FACTS: readonly FactSpec[] = [
  BROWSER_FACTS,
  LAYOUT_FACTS,
  PRODUCT_FACTS,
  BAG_FACTS,
  PRICE_SUMMARY_FACTS,
]

const names = SHOP_FACTS.flatMap((spec) => Object.keys(spec.fields))
const twice = names.find((name, index) => names.indexOf(name) !== index)
if (twice !== undefined)
  throw new Error(`two pages declare the fact "${twice}"`)

export const readShop = (window: Window): ShopFacts =>
  readDeclared(window, ...SHOP_FACTS) as ShopFacts
