import { createContext, use } from 'react'
import { useSelector } from '@xstate/react'
import type { ActorRefFrom, SnapshotFrom } from 'xstate'
import type { checkoutMachine } from '../../flows'

type CheckoutRef = ActorRefFrom<typeof checkoutMachine>
type CheckoutSnapshot = SnapshotFrom<typeof checkoutMachine>

/** The running checkout child machine, provided by CheckoutPage. */
export const CheckoutRefContext = createContext<CheckoutRef | null>(null)

export function useCheckoutRef(): CheckoutRef {
  const checkoutRef = use(CheckoutRefContext)
  if (!checkoutRef) throw new Error('Checkout components need CheckoutPage')
  return checkoutRef
}

export function useCheckoutSelector<T>(
  selector: (snapshot: CheckoutSnapshot) => T,
): T {
  return useSelector(useCheckoutRef(), selector)
}
