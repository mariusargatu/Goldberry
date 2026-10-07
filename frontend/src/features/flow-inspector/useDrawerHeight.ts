import { useState } from 'react'

export type DrawerHeight = 'minimized' | 'step' | 'model'

const STORAGE_KEY = 'goldberry.flow-inspector.height'
const HEIGHTS: readonly string[] = ['minimized', 'step', 'model']

function readHeight(): DrawerHeight {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value !== null && HEIGHTS.includes(value)) return value as DrawerHeight
  } catch {}
  return window.innerWidth < 640 || window.innerHeight < 600
    ? 'minimized'
    : 'step'
}

export function useDrawerHeight() {
  const [height, setHeight] = useState<DrawerHeight>(readHeight)
  const choose = (next: DrawerHeight) => {
    setHeight(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }
  return [height, choose] as const
}
