export type OnRead = (path: string, value: unknown) => void

const isObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null

export function watchReads<T extends object>(
  target: T,
  onRead: OnRead,
  prefix = '',
): T {
  return new Proxy(target, {
    get(object, property, receiver) {
      const value = Reflect.get(object, property, receiver)
      if (typeof property !== 'string') return value
      const path = `${prefix}${property}`
      const descriptor = Reflect.getOwnPropertyDescriptor(object, property)

      const proxiable =
        isObject(value) &&
        descriptor?.configurable !== false &&
        descriptor?.writable !== false
      if (proxiable) return watchReads(value, onRead, `${path}.`)
      if (descriptor !== undefined) onRead(path, value)
      return value
    },
  })
}
