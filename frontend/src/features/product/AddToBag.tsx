import { useEffect, useRef, useState } from 'react'
import type { Product } from '../../api'
import { Button, Icon, buttonStyles, cn } from '../../design-system'
import {
  useJourneyActorRef,
  useJourneySelector,
} from '../journey/JourneyProvider'
import { JourneyLink } from '../journey/JourneyLink'
import { flyToBag } from '../shared/fly-to-bag'
import { useJourneyStep } from '../shared/journey-step'

const ADDED = 'Added to bag'
const ALREADY_ADDED = 'Already added'

/** "<phrase> · View bag →"; the link's aria-label reads it with a comma. */
function ViewBagLabel({ phrase }: { phrase: string }) {
  return (
    <>
      <span>{phrase}</span>
      <span>·</span>
      <span>View bag</span>
      <Icon name="arrow_forward" size={18} />
    </>
  )
}

/**
 * Right after adding. The button's old label rolls up and out as this one
 * rolls in, and the check pops; both play once, when the link replaces the
 * button. The old label then leaves the DOM, so only the new one remains for
 * tools that read the text. With reduced motion there is no roll and the old
 * label never shows: left to its cut-short roll, it would flash for a frame
 * over the new one.
 */
function AddedLabel() {
  const [rolledOut, setRolledOut] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  return (
    <>
      {!rolledOut && (
        <span
          aria-hidden
          onAnimationEnd={() => setRolledOut(true)}
          className="absolute inset-0 flex animate-label-out items-center justify-center gap-2"
        >
          <Icon name="shopping_bag" size={18} />
          Add to bag
        </span>
      )}
      <span className="flex animate-label-in items-center gap-2 self-stretch motion-reduce:animate-none">
        <Icon
          name="check_circle_fill"
          size={20}
          className="animate-check-pop text-secondary-container motion-reduce:animate-none"
        />
        <ViewBagLabel phrase={ADDED} />
      </span>
    </>
  )
}

/**
 * The piece's bag control: "Add to bag" (or "Sold out"), then one link to the
 * bag. It reads "Added to bag" for the rest of the visit once added here, and
 * "Already added" when the piece was in the bag on arrival (after a refresh,
 * or leaving and coming back). The journey's `justAdded` tells the two apart.
 */
export function AddToBag({ product }: { product: Product }) {
  const actorRef = useJourneyActorRef()
  const inBag = useJourneyStep('product') === 'inBag'
  const justAdded = useJourneySelector((snapshot) => snapshot.context.justAdded)
  // The machine decides whether ADD_TO_CART is possible (in stock).
  const canAdd = useJourneySelector((snapshot) =>
    snapshot.can({ type: 'ADD_TO_CART' }),
  )
  const viewBagRef = useRef<HTMLAnchorElement>(null)
  // Adding replaces the focused button with the link; move focus to it rather
  // than let it fall to <body>.
  useEffect(() => {
    if (justAdded) viewBagRef.current?.focus()
  }, [justAdded])

  return (
    <>
      {inBag ? (
        <JourneyLink
          ref={viewBagRef}
          route={{ name: 'cart' }}
          data-testid="view-bag"
          // Spelled out: read from the content, Chrome puts a space before
          // the comma, so the name would not match "Added to bag, View bag".
          aria-label={`${justAdded ? ADDED : ALREADY_ADDED}, View bag`}
          className={cn(
            buttonStyles({
              variant: justAdded ? 'primary' : 'secondary',
              size: 'lg',
            }),
            // The label is centered, so the padding only matters when room is
            // short: "Already added" needs this much to fit a 320px phone.
            'px-space-md',
            justAdded
              ? // overflow-hidden clips the rolling labels to the button.
                'animate-added-shine overflow-hidden motion-reduce:animate-none'
              : 'group',
          )}
          // The second click of a double-click on "Add to bag" lands here; it
          // should not leave the page. Keys and single clicks have detail <= 1.
          onClick={(event) => {
            if (event.detail > 1) event.preventDefault()
          }}
        >
          {justAdded ? (
            <AddedLabel />
          ) : (
            <>
              <Icon
                name="task_alt"
                size={20}
                className="text-secondary group-hover:text-secondary-container"
              />
              <ViewBagLabel phrase={ALREADY_ADDED} />
            </>
          )}
        </JourneyLink>
      ) : (
        <Button
          size="lg"
          icon="shopping_bag"
          disabled={!canAdd}
          data-testid="add-to-bag"
          data-flow-event="ADD_TO_CART"
          onClick={(event) => {
            flyToBag(event.currentTarget, product.image.url)
            actorRef.send({ type: 'ADD_TO_CART' })
          }}
        >
          {canAdd ? 'Add to bag' : 'Sold out'}
        </Button>
      )}
      {/* Present before the change, so screen readers announce it. */}
      <p role="status" className="sr-only">
        {justAdded ? ADDED : ''}
      </p>
    </>
  )
}
