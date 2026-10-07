const TITLES: Readonly<Record<string, string>> = {
  'journey.home': 'Home',
  'journey.home.loading': 'Loading',
  'journey.home.ready': 'Browsing',
  'journey.product': 'Product',
  'journey.product.loading': 'Loading',
  'journey.product.ready': 'Viewing',
  'journey.product.inBag': 'In your bag',
  'journey.cart': 'Bag',
  'journey.checkout': 'Checkout',
  'journey.confirmation': 'Receipt',
  'journey.confirmation.loading': 'Loading',
  'journey.confirmation.ready': 'Reading',
  'checkout.shipping': 'Shipping',
  'checkout.shipping.editing': 'Address',
  'checkout.shipping.quoting': 'Getting a quote',
  'checkout.payment': 'Payment',
  'checkout.payment.enteringCard': 'Card details',
  'checkout.payment.authorizing': 'Confirming payment',
  'checkout.done': 'Order placed',
}

function humanize(name: string): string {
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function titleOf(id: string): string {
  return TITLES[id] ?? humanize(id.split('.').at(-1) ?? id)
}

type Phrase = { done: string; next: string }

const PRODUCT = '{product}'

const EVENT_PHRASES: Readonly<Record<string, Phrase>> = {
  ADD_TO_CART: { done: `Added ${PRODUCT} to the bag`, next: 'Add to bag' },
  UPDATE_QUANTITY: {
    done: 'Changed a quantity in the bag',
    next: 'Change a quantity',
  },
  REMOVE_ITEM: { done: 'Removed an item from the bag', next: 'Remove an item' },
  SUBMIT_SHIPPING: {
    done: 'Sent the shipping address',
    next: 'Continue to payment',
  },
  PLACE_ORDER: { done: 'Sent the payment', next: 'Place the order' },
}

const EDGE_PHRASES: Readonly<Record<string, Phrase>> = {
  'journey#NAVIGATE#0': {
    done: 'Opened the home page',
    next: 'Open the home page',
  },
  'journey#NAVIGATE#1': {
    done: 'Opened a product page',
    next: 'Open a product',
  },
  'journey#NAVIGATE#2': { done: 'Opened the bag', next: 'Open the bag' },
  'journey#NAVIGATE#3': { done: 'Went to checkout', next: 'Check out' },
  'journey#NAVIGATE#4': {
    done: 'Tried to check out with an empty bag',
    next: 'Check out with an empty bag',
  },
  'journey#NAVIGATE#5': { done: 'Opened a receipt', next: 'Open a receipt' },
  'journey.home.loading#xstate.done.actor.loadHome#0': {
    done: 'Home page loaded',
    next: 'Page loads',
  },
  'journey.home.loading#xstate.error.actor.loadHome#0': {
    done: 'Home page loaded without pieces',
    next: 'No pieces arrive',
  },
  'journey.product.loading#xstate.done.actor.loadProduct#0': {
    done: `Loaded ${PRODUCT}, already in the bag`,
    next: 'Already in the bag',
  },
  'journey.product.loading#xstate.done.actor.loadProduct#1': {
    done: `Loaded ${PRODUCT}`,
    next: 'Product loads',
  },
  'journey.product.loading#xstate.error.actor.loadProduct#0': {
    done: 'No such piece: back home',
    next: 'No such piece',
  },
  'journey.checkout#xstate.done.actor.checkout#0': {
    done: 'Order placed',
    next: 'Order placed',
  },
  'checkout.shipping.quoting#xstate.done.actor.quote#0': {
    done: 'Shipping quote received',
    next: 'Quote arrives',
  },
  'checkout.shipping.quoting#xstate.error.actor.quote#0': {
    done: 'Shipping quote failed',
    next: 'Quote fails',
  },
  'checkout.payment.authorizing#xstate.done.actor.placeOrder#0': {
    done: 'Payment went through',
    next: 'Payment goes through',
  },
  'checkout.payment.authorizing#xstate.error.actor.placeOrder#0': {
    done: 'Payment could not be confirmed',
    next: 'Payment not confirmed',
  },
  'journey.confirmation.loading#xstate.done.actor.loadOrder#0': {
    done: 'Receipt loaded',
    next: 'Receipt loads',
  },
  'journey.confirmation.loading#xstate.error.actor.loadOrder#0': {
    done: 'No such receipt: back home',
    next: 'No such receipt',
  },
}

const FOLDED_NEXT: Readonly<Record<string, string>> = {
  'xstate.error.actor.placeOrder': 'Payment fails',
}

function fallbackPhrase(event: string): Phrase {
  const service = serviceEventOf(event)
  if (!service) {
    const words = humanize(event.toLowerCase().replaceAll('_', ' '))
    return { done: words, next: words }
  }
  const name = humanize(service.invoke)
  return service.result === 'done'
    ? { done: `${name} finished`, next: `${name} finishes` }
    : { done: `${name} failed`, next: `${name} fails` }
}

const eventOfId = (edgeId: string) => edgeId.split('#').at(-2) ?? edgeId

function phraseOf(edgeId: string): Phrase {
  const event = eventOfId(edgeId)
  return EDGE_PHRASES[edgeId] ?? EVENT_PHRASES[event] ?? fallbackPhrase(event)
}

export function doneWords(edgeId: string, product: string | null): string {
  return phraseOf(edgeId).done.replace(PRODUCT, product ?? 'the product')
}

export function nextWords(edgeIds: readonly string[]): string {
  const [first = ''] = edgeIds
  const folded = edgeIds.length > 1 ? FOLDED_NEXT[eventOfId(first)] : undefined
  return folded ?? phraseOf(first).next
}

export function eitherOf(moves: readonly string[]): string {
  const [first = '', ...rest] = moves
  const after = rest.map((move) => move.charAt(0).toLowerCase() + move.slice(1))
  const last = after.pop()
  return last ? [first, ...after].join(', ') + ` or ${last}` : first
}

export const OPEN_ANOTHER_PAGE = 'Open another page'

const CONDITIONS: Readonly<Record<string, string>> = {
  canAddProduct: 'only while in stock',
  canEnterCheckout: 'only with items in the bag',
  isValidAddress: 'only with a complete address',
  isValidPayment: 'only with valid card details',
}

export const conditionOf = (guardLabel: string | null): string | null =>
  (guardLabel && CONDITIONS[guardLabel]) || null

export const NOT_REACHABLE_NOW = 'not reachable now'

const NEEDS_AN_ITEM = 'needs an item in the bag'

const GATE_REASONS: Readonly<Record<string, string>> = {
  canAddProduct: 'sold out',
  canEnterCheckout: NEEDS_AN_ITEM,

  'isRoute(checkout)': 'needs an empty bag',

  isAllowedQuantity: 'every quantity at its limit',
  productInBag: 'not in the bag',
  'not productInBag': 'already in the bag',
}

const BAG_LINE_EVENTS: ReadonlySet<string> = new Set([
  'UPDATE_QUANTITY',
  'REMOVE_ITEM',
])

export function reasonOf(
  edgeId: string,
  gate: string | null,
  bagEmpty: boolean,
): string {
  if (bagEmpty && BAG_LINE_EVENTS.has(eventOfId(edgeId))) return NEEDS_AN_ITEM
  return (gate && GATE_REASONS[gate]) || NOT_REACHABLE_NOW
}

type ServiceEvent = { result: 'done' | 'error'; invoke: string }

export function serviceEventOf(event: string): ServiceEvent | null {
  const [, result, invoke] =
    /^xstate\.(done|error)\.actor\.(.+)$/.exec(event) ?? []
  return (result === 'done' || result === 'error') && invoke
    ? { result, invoke }
    : null
}

export function eventLabel(event: string): string {
  const service = serviceEventOf(event)
  return service ? `${service.result}.${service.invoke}` : event
}
