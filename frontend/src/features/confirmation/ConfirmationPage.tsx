import type { ReactNode } from 'react'
import type { Order } from '../../api'
import {
  Card,
  Icon,
  PageContainer,
  Skeleton,
  Stepper,
  buttonStyles,
} from '../../design-system'
import { useJourneySelector } from '../journey/JourneyProvider'
import { JourneyLink } from '../journey/JourneyLink'
import { CHECKOUT_STEPS } from '../shared/checkout-steps'
import { useJourneyStep, type StepOf } from '../shared/journey-step'
import { OrderLines } from '../shared/OrderLines'
import { PriceLedger } from '../shared/PriceLedger'
import { ShipsTo } from '../shared/ShipsTo'

function Receipt({ order }: { order: Order }) {
  const { pricing } = order
  return (
    <div className="flex flex-col gap-space-xl">
      <Stepper
        label="Checkout progress"
        steps={CHECKOUT_STEPS}
        current="Receipt"
      />
      <Card className="flex flex-col items-start gap-space-md md:flex-row md:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
          <Icon name="check" size={24} />
        </span>
        <div className="flex flex-col gap-space-xs">
          <h1 className="text-headline-lg text-primary">
            Thank you — your order is confirmed
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Order{' '}
            <span className="font-mono text-code-sm text-primary">
              {order.number}
            </span>{' '}
            ships with {pricing.shippingMethod.label} within{' '}
            {pricing.shippingMethod.etaDays} days.
          </p>
        </div>
      </Card>
      <div className="grid grid-cols-1 items-start gap-space-xl lg:grid-cols-12">
        <section
          className="flex flex-col gap-space-md lg:col-span-7"
          aria-labelledby="receipt-items"
        >
          <h2 id="receipt-items" className="text-headline-sm text-primary">
            Items
          </h2>
          <OrderLines lines={order.lines} />
        </section>
        <div className="flex flex-col gap-space-lg lg:col-span-5">
          <Card tone="low" className="flex flex-col gap-space-md">
            <h2 className="text-headline-sm text-primary">Payment</h2>
            <PriceLedger quote={pricing} subtotal={pricing.subtotal} />
          </Card>
          <ShipsTo address={order.shippingAddress} />
          <JourneyLink
            route={{ name: 'home' }}
            className={buttonStyles({ size: 'lg' })}
          >
            Continue shopping
          </JourneyLink>
        </div>
      </div>
    </div>
  )
}

export function ConfirmationPage() {
  const step = useJourneyStep('confirmation')
  const order = useJourneySelector((snapshot) => snapshot.context.order)
  const content = {
    loading: (
      <div className="flex flex-col gap-space-md">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    ),
    ready: order && <Receipt order={order} />,
  } satisfies Record<StepOf<'confirmation'>, ReactNode>

  return <PageContainer className="py-space-xl">{content[step]}</PageContainer>
}
