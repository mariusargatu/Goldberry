import { control, facts, type FactsOf, phrase } from '../common/factSpec.ts'
import { PRODUCT, PRODUCT_COPY } from './productLocators.ts'

export const PRODUCT_FACTS = facts(PRODUCT.main, {
  addButton: control(PRODUCT.add),
  addedLink: phrase(PRODUCT.viewBag, {
    added: PRODUCT_COPY.added,
    already: PRODUCT_COPY.already,
  }),
})

export type ProductFacts = FactsOf<typeof PRODUCT_FACTS>

export const productViews = {
  available: (facts: ProductFacts): boolean => facts.addButton === 'enabled',
  soldOut: (facts: ProductFacts): boolean => facts.addButton === 'disabled',
  inBag: (facts: ProductFacts): boolean =>
    facts.addedLink !== null && facts.addButton === null,
}
