// What the payment step shows, read from the frame's facts. Pure.
import type { LayoutFacts } from '../common/layout/layoutFacts.ts'
import { PAYMENT_COPY } from './paymentLocators.ts'

export const paymentViews = {
  /** The card form, nothing loading. */
  paying: (facts: LayoutFacts): boolean =>
    facts.heading === PAYMENT_COPY.heading &&
    facts.sections.includes(PAYMENT_COPY.section) &&
    !facts.busy,
}
