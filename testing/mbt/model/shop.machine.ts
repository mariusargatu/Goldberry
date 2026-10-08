import { assign, setup } from 'xstate'
import {
  type GuardArgs,
  type GuardWrapper,
  wrapGuards,
} from '../../core/index.ts'
import { CATALOG, initialStock } from './fixtures.ts'
import {
  goBack,
  type Leaf,
  LEAVES,
  landing,
  pieceOf,
  pieceOfLink,
  push,
} from './landing.ts'
import { priceBag } from './pricing.ts'
import type { LinkName, ShopContext, ShopEvent } from './shop.types.ts'

const TRANSIENT = { transient: true } as const

type Args = GuardArgs & {
  readonly context: ShopContext
  readonly event: ShopEvent
}

function followed(event: ShopEvent): string | null {
  if (event.type !== 'FOLLOW_LINK') return null
  switch (event.data) {
    case 'view-bag':
      return '/cart'
    case 'check-out':
      return '/checkout'
    default:
      return `/product/${pieceOfLink(event.data)}`
  }
}

const linkIs =
  (link: LinkName) =>
  ({ event }: Args): boolean =>
    event.type === 'FOLLOW_LINK' && event.data === link

const landsOn = Object.fromEntries(
  LEAVES.map((leaf) => [
    `landsOn:${leaf}`,
    ({ context }: Args) => {
      const landed = landing(context, context.url)
      if (landed === null)
        throw new Error(`the model has no page for ${context.url}`)
      return landed.leaf === leaf
    },
  ]),
) as Record<`landsOn:${Leaf}`, (args: Args) => boolean>

const GUARDS = {
  featuredPieceLink: ({ event }: Args) =>
    event.type === 'FOLLOW_LINK' &&
    CATALOG.some((piece) => event.data === `piece:${piece.id}`),
  linkIsViewBag: linkIs('view-bag'),
  linkIsCheckOut: linkIs('check-out'),
  canGoBack: ({ context }: Args) => context.back.length > 0,
  ...landsOn,
}

const followTo = (
  guard: 'featuredPieceLink' | 'linkIsViewBag' | 'linkIsCheckOut',
) => ({
  FOLLOW_LINK: { guard, target: '#shop.routing', actions: 'follow' as const },
})

export function createShopMachine(options: { wrapGuard?: GuardWrapper } = {}) {
  return setup({
    types: { context: {} as ShopContext, events: {} as ShopEvent },
    guards: wrapGuards(GUARDS, options.wrapGuard),
    actions: {
      follow: assign(({ context, event }) => {
        const target = followed(event)
        if (target === null) throw new Error(`no link target for ${event.type}`)
        return push(context, target)
      }),
      back: assign(({ context }) => goBack(context)),
      // A loose action moved the browser: the model takes the page's word
      // for where it is, what Back would do and what the bag holds.
      arrive: assign(({ context, event }) =>
        event.type === 'ARRIVE'
          ? {
              url: event.data.url,
              back: event.data.back,
              bag: event.data.bag,
              stock: event.data.fresh ? initialStock() : context.stock,
            }
          : {},
      ),
      freshPage: assign({ stock: () => initialStock() }),
      canonicalUrl: assign(({ context }) => ({
        url: landing(context, context.url)?.url ?? context.url,
      })),
      clearJustAdded: assign({ justAdded: false }),
      addToBag: assign(({ context }) => ({
        bag: [...context.bag, { pieceId: pieceOf(context.url)!, quantity: 1 }],
        justAdded: true,
      })),
      placeOrder: assign(({ context }) => ({
        orders: [
          ...context.orders,
          {
            bag: context.bag,
            prices: priceBag(context.bag),
            path: null,
          },
        ],
        stock: Object.fromEntries(
          Object.entries(context.stock).map(([id, left]) => [
            id,
            left -
              (context.bag.find((line) => line.pieceId === id)?.quantity ?? 0),
          ]),
        ),
        bag: [],
        url: `/order/${context.orders.length}`,
      })),
    },
  }).createMachine({
    id: 'shop',
    context: () => ({
      bag: [],
      stock: initialStock(),
      justAdded: false,
      orders: [],
      url: '/',
      back: [],
      document: null,
    }),
    initial: 'routing',
    on: {
      ARRIVE: { target: '.routing', actions: 'arrive' },
      BROWSER_BACK: { guard: 'canGoBack', target: '.routing', actions: 'back' },
      BROWSER_RELOAD: { target: '.routing', actions: 'freshPage' },
    },
    states: {
      routing: {
        meta: TRANSIENT,
        always: LEAVES.map((leaf) => ({
          guard: `landsOn:${leaf}` as const,
          target: leaf,
          actions: 'canonicalUrl' as const,
        })),
      },
      home: {
        initial: 'ready',
        states: {
          ready: { on: followTo('featuredPieceLink') },
        },
      },
      product: {
        initial: 'available',
        entry: 'clearJustAdded',
        states: {
          available: {
            on: { ADD_TO_BAG: { target: 'inBag', actions: 'addToBag' } },
          },
          soldOut: {},
          inBag: { on: followTo('linkIsViewBag') },
        },
      },
      bag: {
        initial: 'filled',
        states: {
          empty: {},
          filled: { on: followTo('linkIsCheckOut') },
        },
      },
      checkout: {
        initial: 'shipping',
        states: {
          shipping: { on: { SUBMIT_SHIPPING: 'payment' } },
          payment: {
            on: {
              PLACE_ORDER: { target: '#shop.routing', actions: 'placeOrder' },
            },
          },
        },
      },
      receipt: {
        initial: 'ready',
        states: { ready: {} },
      },
    },
  })
}

export type ShopMachine = ReturnType<typeof createShopMachine>
