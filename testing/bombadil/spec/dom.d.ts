// Bombadil 0.7.8 resolves this module when it bundles the spec, but its
// package lists no types for it; these are the signatures of dist/browser/dom.d.ts.
declare module '@antithesishq/bombadil/browser/dom' {
  export function clickablePoint(
    element: Element,
  ): { x: number; y: number } | null
  export function isVisible(window: Window, element: Element): boolean
  export function inViewport(
    window: Window,
    point: { x: number; y: number },
  ): boolean
}
