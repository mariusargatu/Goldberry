import { useState, type FormEvent } from 'react'
import type { ShippingAddress } from '../../api'
import { Button, Card, Icon, TextField } from '../../design-system'
import { ShipsTo } from '../shared/ShipsTo'
import { useCheckoutRef, useCheckoutSelector } from './useCheckout'

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'US',
}

/**
 * The browser checks the fields (required, and the state and ZIP patterns)
 * before the form submits; the machine's guard checks them again against the
 * contract.
 */
function AddressForm() {
  const checkoutRef = useCheckoutRef()
  const quoting = useCheckoutSelector((snapshot) =>
    snapshot.matches({ shipping: 'quoting' }),
  )
  const [address, setAddress] = useState(EMPTY_ADDRESS)
  const update = (field: keyof ShippingAddress, value: string) =>
    setAddress((current) => ({ ...current, [field]: value }))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    checkoutRef.send({ type: 'SUBMIT_SHIPPING', address })
  }

  return (
    <Card className="flex flex-col gap-space-lg">
      <div className="flex items-center gap-2">
        <Icon name="local_shipping" size={22} className="text-primary" />
        <h2 className="text-headline-sm text-primary">Shipping address</h2>
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid gap-space-md sm:grid-cols-6"
      >
        <TextField
          className="sm:col-span-6"
          label="Full name"
          autoComplete="name"
          required
          maxLength={100}
          value={address.fullName}
          onChange={(event) => update('fullName', event.target.value)}
        />
        <TextField
          className="sm:col-span-6"
          label="Address"
          autoComplete="address-line1"
          required
          maxLength={120}
          value={address.line1}
          onChange={(event) => update('line1', event.target.value)}
        />
        <TextField
          className="sm:col-span-6"
          label="Apartment, suite (optional)"
          autoComplete="address-line2"
          maxLength={120}
          value={address.line2 ?? ''}
          onChange={(event) => update('line2', event.target.value)}
        />
        <TextField
          className="sm:col-span-3"
          label="City"
          autoComplete="address-level2"
          required
          maxLength={80}
          value={address.city}
          onChange={(event) => update('city', event.target.value)}
        />
        <TextField
          className="sm:col-span-1"
          label="State"
          autoComplete="address-level1"
          required
          pattern="[A-Z]{2}"
          maxLength={2}
          value={address.region}
          onChange={(event) =>
            update('region', event.target.value.toUpperCase())
          }
        />
        <TextField
          className="sm:col-span-2"
          label="ZIP code"
          autoComplete="postal-code"
          inputMode="numeric"
          required
          pattern="[0-9]{5}"
          maxLength={5}
          value={address.postalCode}
          onChange={(event) =>
            update('postalCode', event.target.value.replace(/\D/g, ''))
          }
        />
        <Button
          type="submit"
          size="lg"
          className="sm:col-span-6"
          disabled={quoting}
          aria-busy={quoting}
          data-testid="submit-shipping"
          data-flow-event="SUBMIT_SHIPPING"
        >
          {quoting ? 'Calculating shipping…' : 'Continue to payment'}
        </Button>
      </form>
    </Card>
  )
}

/** The form until the address is sent; then where the order goes, for good. */
export function ShippingSection() {
  const shipping = useCheckoutSelector((snapshot) =>
    snapshot.matches('shipping'),
  )
  const address = useCheckoutSelector((snapshot) => snapshot.context.address)
  if (shipping || !address) return <AddressForm />
  return <ShipsTo address={address} />
}
