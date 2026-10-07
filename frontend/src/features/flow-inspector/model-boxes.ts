import type { FlowEdge, FlowNode } from '../../flows/analysis/graph'
import { LABEL_HEIGHT, LABEL_TALL, type Size } from './edge-routes'
import { conditionOf, nextWords, titleOf } from './flow-copy'
import { containerOf, GRAPH, START_ID } from './graph-model'
import { GROUP_TITLE, LABEL, measure, NAME, NOTE, TITLE } from './measure'
import { isException } from './status-styles'
import { edgePageOf } from './step-model'

export const moveOf = (edge: FlowEdge): string => nextWords([edge.id])

export const ownMovesOf = (id: string): FlowEdge[] =>
  GRAPH.edges.filter((edge) => edge.source === id && edge.target === null)

export const childrenOf = (id: string | null): FlowNode[] =>
  GRAPH.nodes.filter(
    (node) =>
      node.kind !== 'root' && node.id !== START_ID && containerOf(node) === id,
  )

export const PAGES: readonly FlowNode[] = childrenOf(null)

export const isExpandable = (id: string): boolean =>
  childrenOf(id).length > 0 || ownMovesOf(id).length > 0

export const countWords = (visited: number, total: number): string =>
  `${visited} of ${total} visited`

export const countOf = (pageId: string): number =>
  GRAPH.edges.filter((edge) => edgePageOf(edge) === pageId).length

export const HEADER_HEIGHT = 40

const INSET = 13

export const STATE_STRIP = 38

export const GROUP_HEADER_HEIGHT = 36

const PAGE = {
  minWidth: 150,

  body: 32,

  meter: 34,

  row: 24,
  movesEnd: 4,

  toggle: 38,

  here: 16,

  moveExtra: 16,
}

const TILE = {
  minWidth: 120,

  mark: 16,

  noteGap: 8,
}

const HEADER_GAP = 12

const LABEL_INSET = 22

export function headOf(id: string): number {
  return childrenOf(id).length > 0 ? GROUP_HEADER_HEIGHT : STATE_STRIP
}

export function tileSize(node: FlowNode, room: number): Size {
  const note = isException(node.key)
    ? TILE.noteGap + measure('error path', NOTE)
    : 0
  return {
    width: Math.max(
      TILE.minWidth,
      2 * INSET + TILE.mark + measure(titleOf(node.id), NAME) + note,
    ),
    height: Math.max(2 + STATE_STRIP, room),
  }
}

export function pageBoxSize(page: FlowNode, open: boolean): Size {
  const total = countOf(page.id)
  const moves = open ? ownMovesOf(page.id).map(moveOf) : []
  const toggle = isExpandable(page.id) ? PAGE.toggle : 0
  return {
    width: Math.max(
      PAGE.minWidth,
      2 * INSET +
        Math.max(
          PAGE.here + measure(titleOf(page.id), TITLE) + toggle,
          measure(countWords(total, total), LABEL) + PAGE.meter,
          ...moves.map((move) => PAGE.moveExtra + measure(move, LABEL)),
        ),
    ),
    height:
      2 +
      HEADER_HEIGHT +
      PAGE.body +
      (moves.length > 0 ? moves.length * PAGE.row + PAGE.movesEnd : 0),
  }
}

export const frameHeadOf = (node: FlowNode): number =>
  containerOf(node) === null ? HEADER_HEIGHT : GROUP_HEADER_HEIGHT

export function frameWidthOf(node: FlowNode): number {
  if (containerOf(node) !== null) {
    return 2 * INSET + measure(titleOf(node.id), GROUP_TITLE)
  }
  const total = countOf(node.id)
  const header =
    PAGE.here +
    measure(titleOf(node.id), TITLE) +
    HEADER_GAP +
    measure(countWords(total, total), LABEL) +
    PAGE.toggle +
    HEADER_GAP -
    8
  return 2 * INSET + header
}

export type MoveLine = { words: string; condition: string | null }

export const linesOf = (edges: readonly FlowEdge[]): MoveLine[] =>
  edges
    .map((edge) => ({
      words: moveOf(edge),
      condition: conditionOf(edge.guardLabel),
    }))
    .filter(
      (line, index, all) =>
        all.findIndex((other) => other.words === line.words) === index,
    )

const MOVE_LINE = 18
const CONDITION_LINE = 16

const CARD_INSET = 8

export function labelSizeOfLines(lines: readonly MoveLine[]): Size {
  const width =
    Math.max(
      0,
      ...lines.flatMap((line) => [
        measure(line.words, LABEL),
        line.condition ? measure(line.condition, NOTE) : 0,
      ]),
    ) + LABEL_INSET
  const [only] = lines
  if (lines.length === 1 && only) {
    return { width, height: only.condition ? LABEL_TALL : LABEL_HEIGHT }
  }
  return {
    width,
    height: lines.reduce(
      (sum, line) => sum + MOVE_LINE + (line.condition ? CONDITION_LINE : 0),
      CARD_INSET,
    ),
  }
}

export const labelSizeOf = (edge: FlowEdge): Size =>
  labelSizeOfLines(linesOf([edge]))
