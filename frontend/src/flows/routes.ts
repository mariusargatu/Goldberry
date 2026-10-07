import { apiSchemas } from '../api/contract'

/** Every journey URL, parsed. */
export type Route =
  | { name: 'home' }
  | { name: 'product'; productId: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'order'; orderId: string }

export type RouteName = Route['name']

const HOME: Route = { name: 'home' }

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/** Parses a location into a Route. Anything the shop can't show is home. */
export function parseRoute(pathname: string): Route {
  const segments = pathname.split('/').filter(Boolean).map(decodeSegment)
  const [first, second, ...rest] = segments
  if (segments.includes(null) || rest.length > 0) return HOME

  if (second === undefined && first === 'cart') return { name: 'cart' }
  if (second === undefined && first === 'checkout') return { name: 'checkout' }
  if (first === 'product' && second) {
    const valid = apiSchemas.GetProductParams.safeParse({
      productId: second,
    }).success
    return valid ? { name: 'product', productId: second } : HOME
  }
  if (first === 'order' && second) {
    const valid = apiSchemas.GetOrderParams.safeParse({
      orderId: second,
    }).success
    return valid ? { name: 'order', orderId: second } : HOME
  }
  return HOME
}

/** Canonical path for a Route. */
export function pathFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/'
    case 'product':
      return `/product/${encodeURIComponent(route.productId)}`
    case 'cart':
      return '/cart'
    case 'checkout':
      return '/checkout'
    case 'order':
      return `/order/${encodeURIComponent(route.orderId)}`
  }
}
