import { useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { Button, Card, Icon, TextField, cn } from '../../design-system'
import { formatMoney } from '../shared/format'
import {
  PAYMENT_TOKEN,
  formatCardNumber,
  formatExpiry,
  hasErrors,
  validateCard,
  type CardDetails,
  type CardField,
  type FieldErrors,
} from './card'
import { focusFirstInvalid, useFocusWhenShown } from './focus'
import { useCheckoutRef, useCheckoutSelector } from './useCheckout'

const EMPTY_CARD: CardDetails = { number: '', expiry: '', cvc: '', name: '' }
const TEST_CARD_HINT =
  'Test card: 4242 4242 4242 4242. Any valid card is approved.'

export function PaymentSection() {
  const checkoutRef = useCheckoutRef()
  const active = useCheckoutSelector((snapshot) => snapshot.matches('payment'))
  const canPay = useCheckoutSelector((snapshot) =>
    snapshot.matches({ payment: 'enteringCard' }),
  )
  const authorizing = useCheckoutSelector((snapshot) =>
    snapshot.matches({ payment: 'authorizing' }),
  )
  const total = useCheckoutSelector((snapshot) => snapshot.context.quote?.total)
  const [card, setCard] = useState(EMPTY_CARD)
  const [submitted, setSubmitted] = useState(false)
  // Focus follows the checkout: to this section once shipping is done.
  const headingRef = useFocusWhenShown<HTMLHeadingElement>(active)

  const errors: FieldErrors<CardField> = submitted ? validateCard(card) : {}
  const update = (field: CardField, value: string) =>
    setCard((current) => ({ ...current, [field]: value }))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    // Render the errors now, so the first invalid field can take focus.
    flushSync(() => setSubmitted(true))
    if (hasErrors(validateCard(card))) {
      focusFirstInvalid(form)
      return
    }
    checkoutRef.send({ type: 'PLACE_ORDER', paymentToken: PAYMENT_TOKEN })
  }

  if (!active) {
    return (
      <Card className="flex items-center gap-space-md">
        <Icon
          name="credit_card"
          size={22}
          className="text-on-surface-variant"
        />
        <div className="flex flex-col">
          <h2 className="text-headline-sm text-on-surface-variant">Payment</h2>
          <p className="text-body-sm text-on-surface-variant">
            Add your shipping address to see the total and pay.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <Card className="flex flex-col gap-space-lg">
        <div className="flex items-center gap-2">
          <Icon name="credit_card" size={22} className="text-primary" />
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-headline-sm text-primary outline-none"
          >
            Credit or debit card
          </h2>
        </div>
        <form
          id="payment-form"
          noValidate
          onSubmit={handleSubmit}
          className="flex flex-col gap-space-md"
        >
          <TextField
            label="Card number"
            mono
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 1234 1234 1234"
            value={card.number}
            error={errors.number}
            hint={TEST_CARD_HINT}
            onChange={(event) =>
              update('number', formatCardNumber(event.target.value))
            }
          />
          <div className="grid grid-cols-2 gap-space-md">
            <TextField
              label="Expiry"
              mono
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM / YY"
              value={card.expiry}
              error={errors.expiry}
              onChange={(event) =>
                update('expiry', formatExpiry(event.target.value))
              }
            />
            <TextField
              label="CVC"
              mono
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              placeholder="123"
              value={card.cvc}
              error={errors.cvc}
              onChange={(event) =>
                update('cvc', event.target.value.replace(/\D/g, ''))
              }
            />
          </div>
          <TextField
            label="Name on card"
            autoComplete="cc-name"
            value={card.name}
            error={errors.name}
            onChange={(event) => update('name', event.target.value)}
          />
        </form>
      </Card>
      <div className="flex flex-col gap-space-sm">
        <Button
          type="submit"
          form="payment-form"
          size="lg"
          icon="lock"
          disabled={!canPay}
          aria-busy={authorizing}
          data-testid="place-order"
          data-flow-event="PLACE_ORDER"
          className={cn(authorizing && 'cursor-progress')}
        >
          {authorizing
            ? 'Placing order…'
            : total
              ? `Pay ${formatMoney(total)} & place order`
              : 'Place order'}
        </Button>
        <p className="flex items-center justify-center gap-space-xs text-body-sm text-on-surface-variant">
          <Icon name="verified" size={16} className="text-primary" />
          Card details stay in your browser; only a payment token is sent.
        </p>
      </div>
    </div>
  )
}
