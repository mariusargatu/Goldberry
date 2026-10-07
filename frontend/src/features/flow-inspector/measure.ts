export type Font = { size: number; weight: number }
export const NAME: Font = { size: 16, weight: 500 }
export const TITLE: Font = { size: 17, weight: 500 }
export const GROUP_TITLE: Font = { size: 15, weight: 500 }
export const LABEL: Font = { size: 15, weight: 400 }
export const NOTE: Font = { size: 14, weight: 400 }

let measurer: {
  canvas: CanvasRenderingContext2D | null
  family: string
} | null = null

export function measure(text: string, { size, weight }: Font): number {
  measurer ??= {
    canvas: document.createElement('canvas').getContext('2d'),
    family:
      getComputedStyle(document.documentElement).getPropertyValue(
        '--font-sans',
      ) || 'sans-serif',
  }
  const { canvas, family } = measurer
  if (!canvas) return Math.ceil(text.length * size * 0.6)
  canvas.font = `${weight} ${size}px ${family}`
  return Math.ceil(canvas.measureText(text).width)
}
