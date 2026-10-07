import type { FlowStatus } from '../../flows/analysis/classify'
import { NOT_REACHABLE_NOW } from './flow-copy'

export const STATUS_LABELS: Record<FlowStatus, string> = {
  active: 'you are here',
  executed: 'visited',
  unvisited: 'not yet',
  impossible: NOT_REACHABLE_NOW,
}

// No error paths are left in the shop's machines; the styling stays for one.
const EXCEPTION_KEYS: ReadonlySet<string> = new Set<string>()

export const isException = (stateKey: string): boolean =>
  EXCEPTION_KEYS.has(stateKey)

export const BOX_CLASSES: Record<FlowStatus, string> = {
  active:
    'border-flow-now/70 bg-insp-state-here text-insp-text shadow-model-here',
  executed: 'border-flow-visited/40 bg-insp-node text-insp-text shadow-model',
  unvisited: 'border-insp-hairline bg-insp-node text-insp-soft shadow-model',
  impossible:
    'border-dashed border-insp-hairline bg-insp-node text-insp-dim flow-impossible-hatch',
}

export const FRAME_CLASSES: Record<FlowStatus, string> = {
  active: 'border-insp-hairline-strong shadow-insp-raised',
  executed: 'border-insp-hairline',
  unvisited: 'border-insp-hairline',
  impossible: 'border-dashed border-insp-hairline',
}

export const NAME_CLASSES: Record<FlowStatus, string> = {
  active: 'text-insp-text',
  executed: 'text-insp-text',
  unvisited: 'text-insp-soft',
  impossible: 'text-insp-dim',
}

export const DOT_CLASSES: Record<FlowStatus, string> = {
  active: 'bg-flow-now',
  executed: 'bg-flow-visited',
  unvisited: 'border-[1.5px] border-insp-muted',
  impossible: 'border-[1.5px] border-dashed border-insp-dim',
}

export const EDGE_STROKES: Record<FlowStatus, string> = {
  active: 'var(--color-flow-now)',
  executed: 'var(--color-flow-visited)',
  unvisited: 'var(--color-flow-edge)',
  impossible: 'var(--color-flow-edge)',
}

export const EDGE_HOVER_STROKES: Record<FlowStatus, string> = {
  ...EDGE_STROKES,
  unvisited: 'var(--color-flow-edge-hover)',
  impossible: 'var(--color-flow-edge-hover)',
}

export const EDGE_LABEL_CLASSES: Record<FlowStatus, string> = {
  active: 'border-flow-now/50 bg-insp-pill-now text-flow-now',
  executed: 'border-flow-visited/40 bg-insp-pill text-insp-soft',
  unvisited: 'border-insp-hairline-soft bg-insp-pill text-insp-muted',
  impossible: 'border-insp-hairline-soft bg-insp-pill text-insp-dim',
}

export const EDGE_LABEL_HOVER_CLASSES: Record<FlowStatus, string> = {
  active: EDGE_LABEL_CLASSES.active,
  executed: 'border-flow-visited/70 bg-insp-pill text-insp-text',
  unvisited: 'border-insp-hairline-strong bg-insp-pill text-insp-soft',
  impossible: 'border-insp-hairline-strong bg-insp-pill text-insp-muted',
}

export const CONDITION_CLASSES: Record<FlowStatus, string> = {
  active: 'text-flow-now',
  executed: 'text-insp-muted',
  unvisited: 'text-insp-dim',
  impossible: 'text-insp-dim',
}
