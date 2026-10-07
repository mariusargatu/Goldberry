import type { AnyStateMachine, OutputFrom, SnapshotFrom } from 'xstate'
import type { Order, Product, Quote, ShippingAddress } from '../api/contract'
import type { Cart } from './cart'
import type {
  CheckoutEvent,
  CheckoutOutput,
  checkoutMachine,
} from './checkout.machine'
import type { HomeData, JourneyEvent, journeyMachine } from './journey.machine'

/**
 * Sample payloads for every event the machines handle, including the
 * `xstate.done.actor.*` / `xstate.error.actor.*` events their invoked actors
 * produce. Path enumeration replays them; impossibility analysis checks each
 * guarded transition against them. Ids are fixed so paths are stable.
 */

/** An invoked actor finished. */
export type DoneSample = {
  type: `xstate.done.actor.${string}`
  output: unknown
}

/** An invoked actor failed. */
export type ErrorSample = {
  type: `xstate.error.actor.${string}`
  error: unknown
}

export type JourneySample = JourneyEvent | DoneSample | ErrorSample
export type CheckoutSample = CheckoutEvent | DoneSample | ErrorSample

const SAMPLE_PRODUCT_ID = 'kaiju-01-obsidian'
const SAMPLE_ORDER_ID = '00000000-0000-4000-8000-000000000001'

const usd = (amount: number) => ({ amount, currency: 'USD' as const })
const image = { url: '/sample.svg', alt: 'Sample figure' }

const SAMPLE_PRODUCT: Product = {
  id: SAMPLE_PRODUCT_ID,
  name: 'Kaiju-01 Obsidian',
  artist: 'Mika Arden',
  price: usd(18_900),
  stock: 12,
  editionSize: 250,
  image,
  description: 'Sample product.',
  material: 'Matte cast vinyl',
  heightCm: 21.5,
  gallery: [image],
}

const SAMPLE_HOME: HomeData = { featured: [SAMPLE_PRODUCT] }

const SAMPLE_ADDRESS: ShippingAddress = {
  fullName: 'Ada Vance',
  line1: '1 Gallery Way',
  city: 'Portland',
  region: 'OR',
  postalCode: '97201',
  country: 'US',
}

const SAMPLE_QUOTE: Quote = {
  subtotal: usd(18_900),
  shipping: usd(1_500),
  tax: usd(1_276),
  total: usd(21_676),
  shippingMethod: {
    id: 'standard',
    label: 'Standard',
    etaDays: 3,
    cost: usd(1_500),
  },
}

const SAMPLE_ORDER: Order = {
  id: SAMPLE_ORDER_ID,
  number: 'GB-100001',
  status: 'confirmed',
  createdAt: '2026-01-01T00:00:00.000Z',
  lines: [
    {
      productId: SAMPLE_PRODUCT_ID,
      name: SAMPLE_PRODUCT.name,
      quantity: 1,
      unitPrice: SAMPLE_PRODUCT.price,
      image,
    },
  ],
  shippingAddress: SAMPLE_ADDRESS,
  pricing: SAMPLE_QUOTE,
}

/** What ApiError looks like: an HTTP status and Problem Details. */
function problem(status: number, code: string) {
  return { status, problem: { status, code, title: code, detail: code } }
}

const NETWORK_ERROR = new TypeError('Failed to fetch')

type Children<TMachine extends AnyStateMachine> = NonNullable<
  SnapshotFrom<TMachine>['children']
>
type InvokeId<TMachine extends AnyStateMachine> = keyof Children<TMachine> &
  string

/**
 * Done/error samples keyed by a machine's invoke ids (its declared children),
 * so a renamed id or a wrong output type fails to compile.
 */
function invokeSamples<TMachine extends AnyStateMachine>() {
  return {
    done: <Id extends InvokeId<TMachine>>(
      id: Id,
      output: OutputFrom<NonNullable<Children<TMachine>[Id]>>,
    ): DoneSample => ({ type: `xstate.done.actor.${id}`, output }),
    failed: (id: InvokeId<TMachine>, error: unknown): ErrorSample => ({
      type: `xstate.error.actor.${id}`,
      error,
    }),
  }
}

const journey = invokeSamples<typeof journeyMachine>()
const checkout = invokeSamples<typeof checkoutMachine>()

const PLACED: CheckoutOutput = { orderId: SAMPLE_ORDER_ID }

/** Journey samples; bag events are derived from the bag so they name real lines. */
export function journeySamples(cart: Cart): readonly JourneySample[] {
  return [
    { type: 'NAVIGATE', route: { name: 'home' } },
    {
      type: 'NAVIGATE',
      route: { name: 'product', productId: SAMPLE_PRODUCT_ID },
    },
    { type: 'NAVIGATE', route: { name: 'cart' } },
    { type: 'NAVIGATE', route: { name: 'checkout' } },
    { type: 'NAVIGATE', route: { name: 'order', orderId: SAMPLE_ORDER_ID } },
    { type: 'ADD_TO_CART' },
    ...cart.flatMap((line): JourneyEvent[] => [
      {
        type: 'UPDATE_QUANTITY',
        productId: line.productId,
        quantity: line.quantity + 1,
      },
      {
        type: 'UPDATE_QUANTITY',
        productId: line.productId,
        quantity: line.quantity - 1,
      },
      { type: 'REMOVE_ITEM', productId: line.productId },
    ]),
    journey.done('loadHome', SAMPLE_HOME),
    journey.failed('loadHome', problem(500, 'internal_error')),
    journey.done('loadProduct', SAMPLE_PRODUCT),
    journey.failed('loadProduct', problem(404, 'not_found')),
    journey.done('checkout', PLACED),
    journey.done('loadOrder', SAMPLE_ORDER),
    journey.failed('loadOrder', problem(404, 'not_found')),
  ]
}

export const CHECKOUT_SAMPLES: readonly CheckoutSample[] = [
  { type: 'SUBMIT_SHIPPING', address: SAMPLE_ADDRESS },
  { type: 'SUBMIT_SHIPPING', address: { ...SAMPLE_ADDRESS, postalCode: '' } },
  { type: 'PLACE_ORDER', paymentToken: 'tok_visa' },
  { type: 'PLACE_ORDER', paymentToken: '' },
  checkout.done('quote', SAMPLE_QUOTE),
  checkout.failed('quote', NETWORK_ERROR),
  checkout.done('placeOrder', SAMPLE_ORDER),
  checkout.failed('placeOrder', NETWORK_ERROR),
]
