// What the home page shows, read from the frame's facts. Pure.
import type { LayoutFacts } from '../common/layout/layoutFacts.ts'
import { HOME_COPY } from './homeLocators.ts'

export const homeViews = {
  /** The featured editions have loaded. */
  ready: (facts: LayoutFacts): boolean =>
    facts.sections.includes(HOME_COPY.featured) && !facts.busy,
}
