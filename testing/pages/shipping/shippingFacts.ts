// What the shipping step shows, read from the frame's facts. Pure.
import type { LayoutFacts } from '../common/layout/layoutFacts.ts'
import { SHIPPING_COPY } from './shippingLocators.ts'

export const shippingViews = {
  /** The address form, nothing loading. */
  editing: (facts: LayoutFacts): boolean =>
    facts.heading === SHIPPING_COPY.heading &&
    facts.sections.includes(SHIPPING_COPY.section) &&
    !facts.busy,
}
