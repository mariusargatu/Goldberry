import {
  assign,
  fromPromise,
  setup,
  type SnapshotFrom,
  type StateValueFrom,
} from 'xstate'
import type { Order, Product, ProductSummary } from '../api/contract'
import {
  addToCart,
  isAllowedQuantity,
  quantityInCart,
  removeFromCart,
  setQuantity,
  type Cart,
} from './cart'
import { checkoutMachine } from './checkout.machine'
import { notProvided } from './not-provided'
import type { Route, RouteName } from './routes'

export type HomeData = { featured: ProductSummary[] }
export type ProductParams = { productId: string }
export type OrderParams = { orderId: string }

export type JourneyContext = {
  cart: Cart
  /** The route of the page being shown (the canonical URL); carries product and order params. */
  route: Route
  home: HomeData | null
  product: Product | null
  /**
   * The shown piece was added on this visit to its page, as opposed to being
   * in the bag on arrival. Set by ADD_TO_CART; every product load clears it.
   */
  justAdded: boolean
  order: Order | null
}

export type JourneyEvent =
  | { type: 'NAVIGATE'; route: Route }
  | { type: 'ADD_TO_CART' }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string }

export type JourneyInput = { cart: Cart }

function productIdOf(route: Route): string {
  return route.name === 'product' ? route.productId : ''
}

function orderIdOf(route: Route): string {
  return route.name === 'order' ? route.orderId : ''
}

export const journeyMachine = setup({
  types: {
    context: {} as JourneyContext,
    events: {} as JourneyEvent,
    input: {} as JourneyInput,
    // Invoke ids, checked against each `invoke` (the event samples key on them).
    children: {} as {
      loadHome: 'loadHome'
      loadProduct: 'loadProduct'
      loadOrder: 'loadOrder'
      checkout: 'checkout'
    },
  },
  actors: {
    loadHome: fromPromise<HomeData>(() => notProvided('loadHome')),
    loadProduct: fromPromise<Product, ProductParams>(() =>
      notProvided('loadProduct'),
    ),
    loadOrder: fromPromise<Order, OrderParams>(() => notProvided('loadOrder')),
    checkout: checkoutMachine,
  },
  guards: {
    isRoute: ({ event }, params: { name: RouteName }) =>
      event.type === 'NAVIGATE' && event.route.name === params.name,
    /** Checkout needs a bag; one named guard so graphs label the edge. */
    canEnterCheckout: ({ context, event }) =>
      event.type === 'NAVIGATE' &&
      event.route.name === 'checkout' &&
      context.cart.length > 0,
    /**
     * Reads the requested id (the route), not the response, so the inspector
     * can judge both branches from live data while the product loads.
     */
    productInBag: ({ context }) =>
      quantityInCart(context.cart, productIdOf(context.route)) > 0,
    /**
     * Only `ready` handles ADD_TO_CART, and there the piece is not in the bag
     * yet: stock is the only condition left.
     */
    canAddProduct: ({ context }) => (context.product?.stock ?? 0) > 0,
    isAllowedQuantity: ({ context, event }) =>
      event.type === 'UPDATE_QUANTITY' &&
      isAllowedQuantity(context.cart, event.productId, event.quantity),
  },
  actions: {
    rememberRoute: assign({
      route: ({ context, event }) =>
        event.type === 'NAVIGATE' ? event.route : context.route,
    }),
    // What the shop can't show (an unknown piece or order), it doesn't: the
    // visitor lands on the front page.
    goHome: assign({ route: { name: 'home' } }),
  },
}).createMachine({
  id: 'journey',
  // Every state's `description` is plain words for a viewer: the inspector's
  // model view shows it in the state's box, as the Stately editor does, and
  // the testing tool reads it from buildGraph().
  description: 'A visit to the shop, from the first page to the receipt.',
  initial: 'booting',
  context: ({ input }) => ({
    cart: input.cart,
    route: { name: 'home' },
    home: null,
    product: null,
    justAdded: false,
    order: null,
  }),
  on: {
    NAVIGATE: [
      {
        guard: { type: 'isRoute', params: { name: 'home' } },
        target: '.home',
        reenter: true,
        actions: 'rememberRoute',
      },
      {
        guard: { type: 'isRoute', params: { name: 'product' } },
        target: '.product',
        reenter: true,
        actions: 'rememberRoute',
      },
      {
        guard: { type: 'isRoute', params: { name: 'cart' } },
        target: '.cart',
        actions: 'rememberRoute',
      },
      {
        guard: 'canEnterCheckout',
        target: '.checkout',
        actions: 'rememberRoute',
      },
      // Checkout with an empty bag lands on the bag instead.
      {
        guard: { type: 'isRoute', params: { name: 'checkout' } },
        target: '.cart',
        actions: assign({ route: { name: 'cart' } }),
      },
      {
        guard: { type: 'isRoute', params: { name: 'order' } },
        target: '.confirmation',
        reenter: true,
        actions: 'rememberRoute',
      },
    ],
  },
  states: {
    /** Waiting for the first NAVIGATE from the URL. */
    booting: {
      description:
        'The shop is starting and reading the link it was opened from.',
    },
    home: {
      description: 'The front page: every piece in the shop.',
      initial: 'loading',
      states: {
        loading: {
          description: 'Fetching the pieces.',
          invoke: {
            id: 'loadHome',
            src: 'loadHome',
            onDone: {
              target: 'ready',
              actions: assign({ home: ({ event }) => event.output }),
            },
            // The front page can't send anyone home: without the API it
            // shows no pieces.
            onError: {
              target: 'ready',
              actions: assign({ home: { featured: [] } }),
            },
          },
        },
        ready: {
          description: 'Shows every piece, each to open.',
        },
      },
    },
    product: {
      description: 'One piece of the shop: its picture, price and stock.',
      initial: 'loading',
      // The inspector's map places states by declaration order (layout.ts);
      // this order keeps its lines and labels from crossing.
      states: {
        loading: {
          description:
            'Fetching the piece, and checking whether it is already in the bag.',
          // Every visit to a product page starts here, so `justAdded` covers
          // only this visit: after a refresh, or leaving and coming back, the
          // piece reads as already in the bag.
          entry: assign({ justAdded: false }),
          invoke: {
            id: 'loadProduct',
            src: 'loadProduct',
            input: ({ context }) => ({ productId: productIdOf(context.route) }),
            onDone: [
              {
                guard: 'productInBag',
                target: 'inBag',
                actions: assign({ product: ({ event }) => event.output }),
              },
              {
                target: 'ready',
                actions: assign({ product: ({ event }) => event.output }),
              },
            ],
            onError: { target: '#journey.home', actions: 'goHome' },
          },
        },
        /** The piece is in the bag; quantities change on the bag page. */
        inBag: {
          description:
            'The piece is in the bag. Change how many on the bag page.',
        },
        /** The piece is not in the bag: it can be added, once. */
        ready: {
          description:
            'Shows the piece and its price. It can be added while it is in stock.',
          on: {
            ADD_TO_CART: {
              guard: 'canAddProduct',
              target: 'inBag',
              actions: assign({
                cart: ({ context }) =>
                  context.product
                    ? addToCart(context.cart, context.product)
                    : context.cart,
                justAdded: true,
              }),
            },
          },
        },
      },
    },
    cart: {
      description:
        'Shows the pieces chosen so far, how many of each, and the subtotal.',
      on: {
        UPDATE_QUANTITY: {
          guard: 'isAllowedQuantity',
          actions: assign({
            cart: ({ context, event }) =>
              setQuantity(context.cart, event.productId, event.quantity),
          }),
        },
        REMOVE_ITEM: {
          actions: assign({
            cart: ({ context, event }) =>
              removeFromCart(context.cart, event.productId),
          }),
        },
      },
    },
    /** The checkout child machine runs the single checkout page. */
    checkout: {
      description:
        'One page in two steps: where to send the order, then how to pay.',
      invoke: {
        id: 'checkout',
        src: 'checkout',
        input: ({ context }) => ({ lines: context.cart }),
        // The order is placed: empty the bag and show its receipt.
        onDone: {
          target: 'confirmation',
          actions: assign({
            cart: [],
            route: ({ event }) => ({
              name: 'order',
              orderId: event.output.orderId,
            }),
          }),
        },
      },
    },
    confirmation: {
      description: 'The receipt for a placed order, with its own link.',
      initial: 'loading',
      states: {
        loading: {
          description: 'Fetching the order.',
          invoke: {
            id: 'loadOrder',
            src: 'loadOrder',
            input: ({ context }) => ({ orderId: orderIdOf(context.route) }),
            onDone: {
              target: 'ready',
              actions: assign({ order: ({ event }) => event.output }),
            },
            // Receipts live in this tab only; another tab's link goes home.
            onError: { target: '#journey.home', actions: 'goHome' },
          },
        },
        ready: {
          description:
            'Shows:\n- The order number and when it ships\n- What was bought and what it cost\n- Where it goes',
        },
      },
    },
  },
})

export type JourneySnapshot = SnapshotFrom<typeof journeyMachine>

/** Top-level journey states (`booting`, `home`, ...); each one is a page. */
export type JourneyStateKey = TopLevelKey<StateValueFrom<typeof journeyMachine>>

type TopLevelKey<Value> = Value extends string ? Value : keyof Value

/**
 * The route the URL should show, or null while booting. Every transition into
 * a page sets `context.route`.
 */
export function routeFor(snapshot: JourneySnapshot): Route | null {
  return snapshot.matches('booting') ? null : snapshot.context.route
}
