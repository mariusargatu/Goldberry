import { Icon, PageContainer, Stepper } from '../../design-system'
import { stateValueToPath } from '../../flows'
import { useJourneySelector } from '../journey/JourneyProvider'
import { JourneyLink } from '../journey/JourneyLink'
import { CHECKOUT_STEPS } from '../shared/checkout-steps'
import { OrderSummary } from './OrderSummary'
import { PaymentSection } from './PaymentSection'
import { ShippingSection } from './ShippingSection'
import { CheckoutRefContext, useCheckoutSelector } from './useCheckout'

function Checkout() {
  const statePath = useCheckoutSelector((snapshot) =>
    stateValueToPath(snapshot.value),
  )

  return (
    <PageContainer className="flex flex-col gap-space-xl py-space-xl">
      <JourneyLink
        route={{ name: 'cart' }}
        className="flex items-center gap-1 self-start text-label-md text-on-surface-variant hover:text-primary"
      >
        <Icon name="arrow_back" size={16} />
        Back to bag
      </JourneyLink>
      <h1 className="sr-only">Checkout</h1>
      <Stepper
        label="Checkout progress"
        steps={CHECKOUT_STEPS}
        current={statePath.startsWith('shipping') ? 'Shipping' : 'Payment'}
      />
      <div className="grid grid-cols-1 items-start gap-space-xl lg:grid-cols-12">
        <div className="flex flex-col gap-space-xl lg:col-span-7">
          <ShippingSection />
          <PaymentSection />
        </div>
        <div className="lg:col-span-5">
          <OrderSummary />
        </div>
      </div>
    </PageContainer>
  )
}

/**
 * Single-page checkout; the checkout child machine decides what each section
 * shows. The journey starts that child on entering `checkout`, before this
 * page renders, so the sections below get a ref that is always there.
 */
export function CheckoutPage() {
  const checkoutRef = useJourneySelector(
    (snapshot) => snapshot.children.checkout,
  )
  if (!checkoutRef) return null
  return (
    <CheckoutRefContext value={checkoutRef}>
      <Checkout />
    </CheckoutRefContext>
  )
}
