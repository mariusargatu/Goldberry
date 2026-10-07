import type { NodeBox, Size } from './edge-routes'

export const ROW_GAP = 32

export type GapAbove = (below: Laid, above: Laid) => number

export type Frame = Size & { nodes: Map<string, NodeBox>; row: number }

export type Laid = Frame & { id: string; column: number }

export function stackOf(
  laid: readonly Laid[],
  gapAbove: GapAbove = () => ROW_GAP,
) {
  const columns = Array.from(
    { length: Math.max(...laid.map((child) => child.column)) + 1 },
    (_, index) => laid.filter((child) => child.column === index),
  )
  const leadOf = (index: number) => {
    const head = columns[index]?.[0]
    if (!head || head.row > 0) return 0
    const group = [columns[index - 1]?.[0], columns[index + 1]?.[0]].find(
      (beside) => beside !== undefined && beside.row > 0,
    )
    return group?.row ?? 0
  }

  const offsetsOf = (column: readonly Laid[], index: number) =>
    column.reduce<number[]>((starts, child, row) => {
      const above = column[row - 1]
      const start = starts.at(-1) ?? leadOf(index)
      return row === 0 || !above
        ? [start]
        : [...starts, start + above.height + gapAbove(child, above)]
    }, [])
  const at = new Map(
    columns.flatMap((column, index) => {
      const starts = offsetsOf(column, index)
      return column.map((child, row) => [child.id, starts[row] ?? 0] as const)
    }),
  )
  const heightOf = (column: readonly Laid[], index: number) => {
    const last = column.at(-1)
    const start = offsetsOf(column, index).at(-1) ?? 0
    return last ? start + last.height : 0
  }
  return { columns, at, heightOf }
}
