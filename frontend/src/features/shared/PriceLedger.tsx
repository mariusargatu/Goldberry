import type { Money, Quote } from '../../api'
import { cn } from '../../design-system'
import { formatMoney } from './format'

function Row({
  testId,
  label,
  value,
  emphasis = false,
}: {
  testId: string
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex items-baseline justify-between gap-space-md',
        // The total sits under a rule (a border: <hr> isn't allowed in a <dl>).
        emphasis &&
          'mt-space-xs border-t border-surface-container-high pt-space-md',
      )}
    >
      <dt
        className={
          emphasis
            ? 'text-headline-sm text-primary'
            : 'text-body-md text-on-surface-variant'
        }
      >
        {label}
      </dt>
      <dd
        className={
          emphasis
            ? 'text-headline-lg text-primary'
            : 'text-body-md font-medium text-primary'
        }
      >
        {value}
      </dd>
    </div>
  )
}

const PENDING = 'Calculated next'

/** Subtotal, shipping, tax and total. Before a quote exists only the subtotal is known. */
export function PriceLedger({
  quote,
  subtotal,
}: {
  quote: Quote | null
  subtotal: Money
}) {
  return (
    <dl data-testid="price-summary" className="flex flex-col gap-2.5">
      <Row
        testId="price-subtotal"
        label="Subtotal"
        value={formatMoney(quote?.subtotal ?? subtotal)}
      />
      <Row
        testId="price-shipping"
        label={quote?.shippingMethod.label ?? 'Shipping'}
        value={
          quote
            ? quote.shipping.amount === 0
              ? 'Free'
              : formatMoney(quote.shipping)
            : PENDING
        }
      />
      <Row
        testId="price-tax"
        label="Tax"
        value={quote ? formatMoney(quote.tax) : PENDING}
      />
      <Row
        testId="price-total"
        label="Total"
        value={quote ? formatMoney(quote.total) : '—'}
        emphasis
      />
    </dl>
  )
}
