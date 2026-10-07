import type { StateValue } from 'xstate'

/** `{ product: 'ready' }` → `'product.ready'`. Machines here have no parallel states. */
export function stateValueToPath(value: StateValue): string {
  if (typeof value === 'string') return value
  const [key, child] = Object.entries(value)[0] ?? []
  if (key === undefined) return ''
  return child === undefined ? key : `${key}.${stateValueToPath(child)}`
}
