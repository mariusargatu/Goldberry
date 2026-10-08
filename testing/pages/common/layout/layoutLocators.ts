export const LAYOUT = {
  main: 'main',
  heading: 'h1',
  section: 'h2',
  busy: '[aria-busy="true"]',
} as const

/**
 * Never clicked by Bombadil on its own: the crash screen's Reload would load
 * a fresh page behind the model.
 */
export const LAYOUT_OFF_LIMITS: readonly string[] = ['[role="alert"] button']
