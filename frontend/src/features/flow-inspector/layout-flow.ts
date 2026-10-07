import type { EdgeRoute, NodeBox, Point, Size } from './edge-routes'

export type Flow = 'across' | 'down'

export const turned = (size: Size, down: boolean): Size =>
  down ? { width: size.height, height: size.width } : size

const flip = ({ x, y }: Point): Point => ({ x: y, y: x })

export const flipBox = (box: NodeBox): NodeBox => ({
  x: box.y,
  y: box.x,
  width: box.height,
  height: box.width,
})

export const flipRoute = (route: EdgeRoute): EdgeRoute => ({
  ...route,
  points: route.points.map(flip),
  label: flip(route.label),
})

export const flipPoint = flip

export const flipAll = <K, V>(
  map: ReadonlyMap<K, V>,
  mirror: (value: V) => V,
): Map<K, V> => new Map([...map].map(([key, value]) => [key, mirror(value)]))
