import { fromPromise } from 'xstate'
import {
  createOrder,
  createQuote,
  getOrder,
  getProduct,
  listProducts,
  type CreateOrderRequest,
  type Order,
  type Product,
  type Quote,
  type QuoteRequest,
} from '../../api'
import {
  checkoutMachine,
  type HomeData,
  type OrderParams,
  type ProductParams,
} from '../../flows'

/**
 * A promise actor for an API call whose aborted runs never settle. XState
 * aborts a promise actor's signal when the actor stops; in dev, React
 * StrictMode then restarts the same actor (fresh signal, new request), and a
 * rejection from the aborted run would otherwise be delivered to the restarted
 * actor as a real failure.
 */
function request<Output, Input = unknown>(
  call: (input: Input, signal: AbortSignal) => Promise<Output>,
) {
  return fromPromise<Output, Input>(({ input, signal }) =>
    call(input, signal).catch((error: unknown) => {
      if (signal.aborted) return new Promise<Output>(() => {})
      throw error
    }),
  )
}

/** Real implementations of the checkout machine's named actors. */
const checkoutActors = {
  getQuote: request<Quote, QuoteRequest>((input, signal) =>
    createQuote(input, { signal }),
  ),
  placeOrder: request<Order, CreateOrderRequest | null>((input, signal) =>
    input
      ? createOrder(input, { signal })
      : Promise.reject(new Error('Checkout has no address or payment yet')),
  ),
}

/** Real implementations of the journey's named actors, backed by the API client. */
export const journeyActors = {
  loadHome: request<HomeData>((_, signal) =>
    listProducts({ signal }).then((featured) => ({ featured })),
  ),
  loadProduct: request<Product, ProductParams>((input, signal) =>
    getProduct(input.productId, { signal }),
  ),
  loadOrder: request<Order, OrderParams>((input, signal) =>
    getOrder(input.orderId, { signal }),
  ),
  checkout: checkoutMachine.provide({ actors: checkoutActors }),
}
