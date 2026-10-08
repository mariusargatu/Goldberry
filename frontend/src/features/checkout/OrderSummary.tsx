import { Badge, Card } from '../../design-system'
import { cartCount, cartSubtotal } from '../../flows'
import { plural } from '../shared/format'
import { OrderLines } from '../shared/OrderLines'
import { PriceLedger } from '../shared/PriceLedger'
import { useCheckoutSelector } from './useCheckout'

export function OrderSummary() {
  const lines = useCheckoutSelector((snapshot) => snapshot.context.lines)
  const quote = useCheckoutSelector((snapshot) => snapshot.context.quote)

  return (
    <Card tone="low" className="flex flex-col gap-space-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-headline-sm text-primary">Order summary</h2>
        <Badge variant="pill">{plural(cartCount(lines), 'item')}</Badge>
      </div>
      <OrderLines lines={lines} />
      <PriceLedger quote={quote} subtotal={cartSubtotal(lines)} />
    </Card>
  )
}
