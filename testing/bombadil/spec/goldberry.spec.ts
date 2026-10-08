import type { ActionTemplate } from '@antithesishq/bombadil/browser'
import { actions, weighted } from '@antithesishq/bombadil/browser'
import type { ModelEvent } from '../../core/model.ts'
import { modelEvent, resync, settle } from './actions.ts'
import { model } from './extractors.ts'
import { lastWasLoose, looseActions } from './loose.ts'

export {
  noHttpErrorCodes,
  noUncaughtExceptions,
  noUnhandledPromiseRejections,
} from '@antithesishq/bombadil/browser/defaults/properties'
export {
  modelHolds,
  noConsoleErrors,
  noRenderingSlips,
  totalsAddUp,
} from './properties.ts'

/** How much of the walk is Bombadil's own, while the model has doors to offer. */
const LOOSE_SHARE = 0.4

/** The funnel's way forward first; Back, Reload and the edges less often. */
function weightOf(event: ModelEvent): number {
  if (
    event.type === 'FOLLOW_LINK' ||
    event.type === 'ADD_TO_BAG' ||
    event.type === 'SUBMIT_SHIPPING'
  )
    return 4
  if (event.type === 'PLACE_ORDER') return 2
  if (event.type === 'BROWSER_BACK' || event.type === 'BROWSER_RELOAD') return 2
  return 1
}

/** Novelty: a door taken often from this abstract state weighs less. */
const novel = (weight: number, taken: number): number =>
  Math.max(1, Math.round((weight * 10) / (1 + taken)))

export const exploration = actions(() => {
  const channel = model.current
  if (channel === null) return [resync()]
  if (channel.busy !== null) return ['Wait']
  // Bombadil acted on its own: the model reads where it is before anything.
  if (lastWasLoose.current === true) return [settle()]
  const doors = channel.enabled.map(
    (event, index): [number, ActionTemplate] => [
      novel(weightOf(event), channel.taken[index] ?? 0),
      modelEvent(event.type, event.data as never),
    ],
  )
  const loose = looseActions()
  if (doors.length === 0) return loose.generate()
  const doorWeight = doors.reduce((sum, [weight]) => sum + weight, 0)
  const looseWeight = Math.max(
    1,
    Math.round((doorWeight * LOOSE_SHARE) / (1 - LOOSE_SHARE)),
  )
  return weighted([
    [doorWeight, weighted(doors)],
    [looseWeight, loose],
  ]).generate()
})
