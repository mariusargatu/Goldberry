// What the receipt shows, read from the frame's facts. Pure.
import type { LayoutFacts } from '../common/layout/layoutFacts.ts'
import { RECEIPT_COPY } from './receiptLocators.ts'

export const receiptViews = {
  ready: (facts: LayoutFacts): boolean =>
    facts.heading === RECEIPT_COPY.heading,
}
