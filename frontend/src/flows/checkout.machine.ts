import { assign, fromPromise, setup } from 'xstate'
import type {
  CreateOrderRequest,
  Order,
  Quote,
  QuoteRequest,
  ShippingAddress,
} from '../api/contract'
import { isValidAddress } from './address'
import type { Cart } from './cart'
import { notProvided } from './not-provided'
import { isValidPayment, type PaymentDetails } from './payment'

export type CheckoutInput = { lines: Cart }

export type CheckoutOutput = { orderId: string }

export type CheckoutContext = {
  lines: Cart
  address: ShippingAddress | null
  quote: Quote | null
  payment: PaymentDetails | null
  orderId: string | null
}

export type CheckoutEvent =
  | { type: 'SUBMIT_SHIPPING'; address: ShippingAddress }
  | ({ type: 'PLACE_ORDER' } & PaymentDetails)

function quoteRequestOf(context: CheckoutContext): QuoteRequest {
  return {
    items: context.lines.map(({ productId, quantity }) => ({
      productId,
      quantity,
    })),
    postalCode: context.address?.postalCode ?? '',
  }
}

/**
 * `payment.authorizing` is only reachable once the address and payment are
 * stored. Null breaks that rule, and the placeOrder actor then fails back to
 * entering the card; throwing here instead would stop the whole journey.
 */
function orderOf(context: CheckoutContext): CreateOrderRequest | null {
  const { address, payment } = context
  if (!address || !payment) return null
  return {
    items: quoteRequestOf(context).items,
    shippingAddress: address,
    paymentToken: payment.paymentToken,
  }
}

export const checkoutMachine = setup({
  types: {
    context: {} as CheckoutContext,
    events: {} as CheckoutEvent,
    input: {} as CheckoutInput,
    output: {} as CheckoutOutput,
    // Invoke ids, checked against each `invoke` (the event samples key on them).
    children: {} as {
      quote: 'getQuote'
      placeOrder: 'placeOrder'
    },
  },
  actors: {
    getQuote: fromPromise<Quote, QuoteRequest>(() => notProvided('getQuote')),
    placeOrder: fromPromise<Order, CreateOrderRequest | null>(() =>
      notProvided('placeOrder'),
    ),
  },
  guards: {
    isValidAddress: ({ event }) =>
      event.type === 'SUBMIT_SHIPPING' && isValidAddress(event.address),
    isValidPayment: ({ event }) =>
      event.type === 'PLACE_ORDER' && isValidPayment(event),
  },
  actions: {
    storePayment: assign({
      payment: ({ context, event }) =>
        event.type === 'PLACE_ORDER'
          ? { paymentToken: event.paymentToken }
          : context.payment,
    }),
  },
}).createMachine({
  id: 'checkout',
  // Plain words for a viewer, as in the journey machine: the inspector's
  // model view shows them, and buildGraph() hands them to the testing tool.
  description: 'Paying for the bag: the delivery address first, then the card.',
  initial: 'shipping',
  context: ({ input }) => ({
    lines: input.lines,
    address: null,
    quote: null,
    payment: null,
    orderId: null,
  }),
  // Every request has a way back: a failure the shop does not explain leaves
  // the visitor on the step they were on, free to try again.
  states: {
    shipping: {
      description: 'Where the order goes, and what delivery costs.',
      initial: 'editing',
      states: {
        editing: {
          description:
            'Requirements:\n- Full name, street, city and state\n- A 5-digit ZIP',
          on: {
            SUBMIT_SHIPPING: {
              guard: 'isValidAddress',
              target: 'quoting',
              actions: assign({ address: ({ event }) => event.address }),
            },
          },
        },
        quoting: {
          description: 'Asking what delivery to this address costs.',
          invoke: {
            id: 'quote',
            src: 'getQuote',
            input: ({ context }) => quoteRequestOf(context),
            onDone: {
              target: '#checkout.payment',
              actions: assign({ quote: ({ event }) => event.output }),
            },
            onError: { target: 'editing' },
          },
        },
      },
    },
    payment: {
      description: 'The card, and placing the order.',
      initial: 'enteringCard',
      states: {
        enteringCard: {
          description:
            'Requirements:\n- Card number, expiry date, security code and name on the card',
          on: {
            PLACE_ORDER: {
              guard: 'isValidPayment',
              target: 'authorizing',
              actions: 'storePayment',
            },
          },
        },
        authorizing: {
          description:
            'Sending the order, and waiting for the card payment to go through.',
          invoke: {
            id: 'placeOrder',
            src: 'placeOrder',
            input: ({ context }) => orderOf(context),
            onDone: {
              target: '#checkout.done',
              actions: assign({ orderId: ({ event }) => event.output.id }),
            },
            onError: { target: 'enteringCard' },
          },
        },
      },
    },
    done: {
      description:
        'The payment went through and the order is placed. The receipt opens next.',
      type: 'final',
    },
  },
  output: ({ context }) => ({ orderId: context.orderId ?? '' }),
})
