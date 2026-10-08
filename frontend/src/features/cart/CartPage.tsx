import { useRef } from 'react'
import {
  Card,
  MessagePanel,
  PageContainer,
  buttonStyles,
} from '../../design-system'
import { cartCount, cartSubtotal } from '../../flows'
import { useJourneySelector } from '../journey/JourneyProvider'
import { JourneyLink } from '../journey/JourneyLink'
import { formatMoney, plural } from '../shared/format'
import { CartLineRow } from './CartLineRow'

export function CartPage() {
  const cart = useJourneySelector((snapshot) => snapshot.context.cart)
  // The heading stays when the bag empties, so removing the last line can
  // hand focus to it.
  const headingRef = useRef<HTMLHeadingElement>(null)

  return (
    <PageContainer className="flex flex-col gap-space-lg py-space-xl">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-headline-lg text-primary outline-none"
      >
        Your bag
      </h1>
      {cart.length === 0 ? (
        <MessagePanel
          icon="shopping_bag"
          title="Your bag is empty"
          description="Find something you love in the shop."
          action={
            <JourneyLink route={{ name: 'home' }} className={buttonStyles()}>
              Back to the shop
            </JourneyLink>
          }
        />
      ) : (
        /* grid-cols-1 keeps long rows from widening the page on small phones. */
        <div className="grid grid-cols-1 items-start gap-space-xl lg:grid-cols-12">
          <ul className="flex flex-col gap-space-md lg:col-span-7">
            {cart.map((line) => (
              <CartLineRow
                key={line.productId}
                line={line}
                fallbackFocusRef={headingRef}
              />
            ))}
          </ul>
          <Card tone="low" className="flex flex-col gap-space-md lg:col-span-5">
            <h2 className="text-headline-sm text-primary">Summary</h2>
            <div
              data-testid="bag-subtotal"
              className="flex items-center justify-between text-body-md"
            >
              <span className="text-on-surface-variant">
                Subtotal ({plural(cartCount(cart), 'item')})
              </span>
              <span className="font-semibold text-primary">
                {formatMoney(cartSubtotal(cart))}
              </span>
            </div>
            <p className="border-t border-surface-container-high pt-space-md text-body-sm text-on-surface-variant">
              Shipping and tax are calculated at checkout.
            </p>
            <JourneyLink
              route={{ name: 'checkout' }}
              data-testid="check-out"
              className={buttonStyles({ size: 'lg' })}
            >
              Check out
            </JourneyLink>
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
