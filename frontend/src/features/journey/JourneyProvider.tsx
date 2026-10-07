import { useEffect, useState, type ReactNode } from 'react'
import { createActorContext } from '@xstate/react'
import { journeyMachine } from '../../flows'
// The recorder module only: the analysis barrel would also load paths.ts.
import { createSessionRecorder } from '../../flows/analysis/recorder'
import { createFlowProbe } from '../flow-inspector/flow-probe'
import { journeyActors } from './actors'
import { loadCart, saveCart } from './cart-storage'

const JourneyActorContext = createActorContext(
  journeyMachine.provide({ actors: journeyActors }),
)

export const useJourneySelector = JourneyActorContext.useSelector
export const useJourneyActorRef = JourneyActorContext.useActorRef

/** One recorder per page load; the journey actor reports to it through `inspect`. */
const sessionRecorder = createSessionRecorder()

/**
 * Reads each step against the model for the drawer, the console flow log and
 * `window.goldberryFlow`. It sits in the actor's `inspect`, not in the
 * drawer, so testing tools get it whatever the drawer shows.
 */
export const flowProbe = createFlowProbe(sessionRecorder)

/** Saves the bag whenever it changes. */
function CartPersistence() {
  const cart = useJourneySelector((snapshot) => snapshot.context.cart)
  useEffect(() => saveCart(cart), [cart])
  return null
}

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [input] = useState(() => ({ cart: loadCart() }))
  return (
    <JourneyActorContext.Provider
      options={{ input, inspect: flowProbe.inspect }}
    >
      <CartPersistence />
      {children}
    </JourneyActorContext.Provider>
  )
}
