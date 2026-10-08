import { useRef, type RefObject } from 'react'
import { Button } from '../../design-system'
import type { CartLine, JourneySnapshot } from '../../flows'
import {
  useJourneyActorRef,
  useJourneySelector,
} from '../journey/JourneyProvider'
import { JourneyLink } from '../journey/JourneyLink'
import { formatLineTotal, formatMoney } from '../shared/format'

export function CartLineRow({
  line,
  fallbackFocusRef,
}: {
  line: CartLine
  /** Takes focus when this row was the bag's only line. */
  fallbackFocusRef: RefObject<HTMLElement | null>
}) {
  const actorRef = useJourneyActorRef()
  const { productId } = line
  // The machine's quantity guard decides which steps are possible.
  const canSet = (snapshot: JourneySnapshot, quantity: number) =>
    snapshot.can({ type: 'UPDATE_QUANTITY', productId, quantity })
  const canDecrease = useJourneySelector((snapshot) =>
    canSet(snapshot, line.quantity - 1),
  )
  const canIncrease = useJourneySelector((snapshot) =>
    canSet(snapshot, line.quantity + 1),
  )
  const rowRef = useRef<HTMLLIElement>(null)
  const decreaseRef = useRef<HTMLButtonElement>(null)
  const increaseRef = useRef<HTMLButtonElement>(null)

  function step(delta: 1 | -1) {
    const quantity = line.quantity + delta
    actorRef.send({ type: 'UPDATE_QUANTITY', productId, quantity })
    // At a bound the pressed button turns disabled, which would drop focus.
    const sibling = delta > 0 ? decreaseRef : increaseRef
    if (!canSet(actorRef.getSnapshot(), quantity + delta))
      sibling.current?.focus()
  }

  function remove() {
    // The pressed button leaves with its row: focus the next line's link, else
    // the previous line's, else the fallback. Neighbours keep their DOM nodes.
    const row = rowRef.current
    const neighbour = row?.nextElementSibling ?? row?.previousElementSibling
    actorRef.send({ type: 'REMOVE_ITEM', productId })
    const link = neighbour?.querySelector('a')
    if (link) link.focus()
    else fallbackFocusRef.current?.focus()
  }

  return (
    <li
      ref={rowRef}
      data-testid="bag-line"
      className="flex gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
    >
      <img
        src={line.image.url}
        alt=""
        className="size-20 shrink-0 rounded-lg bg-surface-container-low object-cover sm:size-24"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-space-sm">
        <div className="flex items-start justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col">
            <JourneyLink
              route={{ name: 'product', productId }}
              data-testid="bag-line-piece"
              className="truncate text-headline-sm text-primary hover:underline"
            >
              {line.name}
            </JourneyLink>
            <span className="text-body-sm text-on-surface-variant">
              {line.artist} · {formatMoney(line.unitPrice)} each
            </span>
          </div>
          <span className="text-label-lg text-primary">
            {formatLineTotal(line)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-space-sm">
          <div
            className="flex items-center gap-space-xs"
            role="group"
            aria-label={`Quantity of ${line.name}`}
          >
            <Button
              ref={decreaseRef}
              variant="ghost"
              size="icon"
              icon="remove"
              aria-label="Decrease quantity"
              disabled={!canDecrease}
              data-flow-event="UPDATE_QUANTITY"
              onClick={() => step(-1)}
            />
            <span
              data-testid="bag-line-quantity"
              className="w-8 text-center font-mono text-code-sm text-primary"
              aria-live="polite"
            >
              {line.quantity}
            </span>
            <Button
              ref={increaseRef}
              variant="ghost"
              size="icon"
              icon="add"
              aria-label="Increase quantity"
              disabled={!canIncrease}
              data-flow-event="UPDATE_QUANTITY"
              onClick={() => step(1)}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon="delete"
            data-testid="bag-line-remove"
            data-flow-event="REMOVE_ITEM"
            onClick={remove}
          >
            {/* Icon-only on phones, so the row fits; the name stays "Remove <piece>". */}
            <span className="sr-only sm:not-sr-only">Remove</span>
            <span className="sr-only"> {line.name}</span>
          </Button>
        </div>
      </div>
    </li>
  )
}
