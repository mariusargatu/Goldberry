import type { JourneySnapshot } from '../../flows'
import { useJourneySelector } from '../journey/JourneyProvider'

type PageValue = Extract<JourneySnapshot['value'], object>
type KeysOf<T> = T extends object ? keyof T : never
type PageWithSteps = KeysOf<PageValue>

/** The journey's state value while on a page, e.g. `{ home: 'ready' | … }`. */
type PageState<Page extends PageWithSteps> = Extract<
  PageValue,
  Record<Page, unknown>
>

/** The sub-states of a journey page, e.g. `'loading' | 'ready'` for `home`. */
export type StepOf<Page extends PageWithSteps> = PageState<Page>[Page]

/**
 * The current sub-state of a page. Pages switch on it through an exhaustive
 * record, so a sub-state added to the machine fails the type check until the
 * page draws it.
 */
export function useJourneyStep<Page extends PageWithSteps>(
  page: Page,
): StepOf<Page> {
  // JourneyView renders a page only while the journey is in that page's state.
  return useJourneySelector(
    (snapshot) => (snapshot.value as PageState<Page>)[page],
  )
}
