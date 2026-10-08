import { exists, facts, type FactsOf, text, texts } from '../factSpec.ts'
import { LAYOUT } from './layoutLocators.ts'

export const LAYOUT_FACTS = facts(LAYOUT.main, {
  heading: text(LAYOUT.heading),
  sections: texts(LAYOUT.section),
  busy: exists(LAYOUT.busy),
})

export type LayoutFacts = FactsOf<typeof LAYOUT_FACTS>
