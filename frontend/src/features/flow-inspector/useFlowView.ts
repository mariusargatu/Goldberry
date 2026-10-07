import { useState, useSyncExternalStore } from 'react'
import { flowProbe } from '../journey/JourneyProvider'
import type { FlowView } from './flow-probe'

export function useFlowView(): FlowView {
  return useSyncExternalStore(flowProbe.subscribe, flowProbe.getView)
}

export function useNewSteps(count: number): number {
  const [seen, setSeen] = useState({ count, added: 0 })
  if (seen.count !== count) {
    const next = { count, added: Math.max(0, count - seen.count) }
    setSeen(next)
    return next.added
  }
  return seen.added
}

