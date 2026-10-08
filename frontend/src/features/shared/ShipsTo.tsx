import type { ReactNode } from 'react'
import type { ShippingAddress } from '../../api'
import { Card, Icon } from '../../design-system'

/** The delivery address card on the checkout and the receipt. */
export function ShipsTo({
  address,
  action,
}: {
  address: ShippingAddress
  action?: ReactNode
}) {
  return (
    <Card padding="md" className="flex items-start gap-space-md">
      <Icon name="pin_drop" className="text-on-surface-variant" />
      <div className="flex flex-1 flex-col">
        <span className="text-label-sm tracking-wider text-on-surface-variant uppercase">
          Ships to
        </span>
        <span className="text-body-sm text-primary">
          {address.fullName}
          <br />
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ''}
          <br />
          {address.city}, {address.region} {address.postalCode}
        </span>
      </div>
      {action}
    </Card>
  )
}
