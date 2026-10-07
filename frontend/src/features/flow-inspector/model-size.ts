import { marginOf, readableZoomOf } from './camera'
import { layoutGraph } from './layout'
import type { Flow } from './layout-flow'
import { isExpandable, PAGES } from './model-boxes'
import type { NodeBox } from './edge-routes'

const opened = new Map<Flow, readonly NodeBox[]>()

function openPages(flow: Flow): readonly NodeBox[] {
  const known = opened.get(flow)
  if (known) return known
  const boxes = PAGES.filter((page) => isExpandable(page.id)).flatMap(
    (page) => layoutGraph(new Set([page.id]), flow).absolute.get(page.id) ?? [],
  )
  opened.set(flow, boxes)
  return boxes
}

function spanAt(flow: Flow, zoom: number): number {
  const along = (box: NodeBox) => (flow === 'down' ? box.width : box.height)
  const page = Math.max(0, ...openPages(flow).map(along)) * zoom
  return Math.ceil(page + 2 * marginOf(page))
}

export const canvasHeights = (): Record<string, string> => ({
  '--model-canvas': `${spanAt('across', readableZoomOf([640, Infinity]))}px`,
  '--model-canvas-narrow': `${spanAt('across', readableZoomOf([639, Infinity]))}px`,
})

export const sidebarWidth = (): number =>
  spanAt('down', readableZoomOf([1024, Infinity]))
