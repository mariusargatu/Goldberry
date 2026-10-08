import { facts, type FactsOf, attr, int, list } from '../common/factSpec.ts'
import type { LayoutFacts } from '../common/layout/layoutFacts.ts'
import { BAG, BAG_COPY } from './bagLocators.ts'

export const BAG_FACTS = facts(BAG.main, {
  bag: list(BAG.line, {
    pieceId: attr(BAG.piece, 'href', BAG.piecePath),
    quantity: int(BAG.quantity),
  }),
})

export type BagFacts = FactsOf<typeof BAG_FACTS>

type Shown = LayoutFacts & BagFacts

export const bagViews = {
  empty: (facts: Shown): boolean =>
    facts.heading === BAG_COPY.heading && facts.bag.length === 0,
  filled: (facts: Shown): boolean =>
    facts.heading === BAG_COPY.heading && facts.bag.length > 0,
}
