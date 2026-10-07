import type { Viewport } from '@xyflow/react'
import type { NodeBox } from './edge-routes'
import type { GraphLayout } from './layout'

export type Canvas = readonly [width: number, height: number]

type Span = readonly [number, number]

export const marginOf = (length: number) =>
  Math.min(24, Math.max(8, Math.round(length / 16)))

export const readableZoomOf = ([width, height]: Canvas) =>
  width < 640 || height < 240 ? 0.7 : 0.8

const spansOf = (box: NodeBox): [Span, Span] => [
  [box.x, box.x + box.width],
  [box.y, box.y + box.height],
]

const fitOf = (box: NodeBox, [width, height]: Canvas) =>
  Math.min(
    1,
    (width - 2 * marginOf(width)) / box.width,
    (height - 2 * marginOf(height)) / box.height,
  )

function aim(
  [start, end]: Span,
  [, focusEnd]: Span,
  room: number,
  zoom: number,
): number {
  const margin = marginOf(room)
  if ((end - start) * zoom <= room - 2 * margin) {
    return room / 2 - ((start + end) / 2) * zoom
  }
  const fromStart = margin - start * zoom
  return focusEnd * zoom + fromStart <= room - margin
    ? fromStart
    : room - margin - focusEnd * zoom
}

export function overviewOf(
  layout: GraphLayout,
  canvas: Canvas,
  activeId: string,
  pageId: string | null,
  held?: number,
): Viewport {
  const [width, height] = canvas
  const readable = readableZoomOf(canvas)
  const whole = fitOf(layout.bounds, canvas)
  const page = (pageId && layout.absolute.get(pageId)) || layout.bounds
  const base = held ?? readable
  const zoom =
    whole >= readable
      ? Math.min(whole, base)
      : Math.max(readable * 0.9, Math.min(base, fitOf(page, canvas)))
  const shown = whole >= readable ? layout.bounds : page
  const focus = layout.absolute.get(activeId) ?? shown
  const [across, down] = spansOf(shown)
  const [focusAcross, focusDown] = spansOf(focus)
  return {
    x: aim(across, focusAcross, width, zoom),
    y: aim(down, focusDown, height, zoom),
    zoom,
  }
}

function panFor([start, end]: Span, at: number, room: number, zoom: number) {
  const margin = marginOf(room)
  if (start * zoom + at < margin || (end - start) * zoom > room - 2 * margin) {
    return margin - start * zoom
  }
  return end * zoom + at > room - margin ? room - margin - end * zoom : at
}

export function followOf(
  layout: GraphLayout,
  [width, height]: Canvas,
  { x, y, zoom }: Viewport,
  activeId: string,
  pageId: string | null,
): Viewport | null {
  const state =
    layout.absolute.get(activeId) ?? (pageId && layout.absolute.get(pageId))
  if (!state) return null
  const [across, down] = spansOf(state)
  const next = {
    x: panFor(across, x, width, zoom),
    y: panFor(down, y, height, zoom),
    zoom,
  }
  return next.x === x && next.y === y ? null : next
}
