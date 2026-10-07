import {
  buildGraph,
  type FlowEdge,
  type FlowNode,
} from '../../flows/analysis/graph'

export const GRAPH = buildGraph()
export const BY_ID: ReadonlyMap<string, FlowNode> = new Map(
  GRAPH.nodes.map((node) => [node.id, node]),
)
export const EDGE_BY_ID: ReadonlyMap<string, FlowEdge> = new Map(
  GRAPH.edges.map((edge) => [edge.id, edge]),
)

export function containerOf(node: FlowNode): string | null {
  const parent = node.parentId ? BY_ID.get(node.parentId) : undefined
  return parent && parent.kind !== 'root' ? parent.id : null
}

export const START_ID = 'journey.booting'

const wayInto = (pageId: string): FlowEdge | undefined =>
  GRAPH.edges.find((edge) => edge.fromRoot && edge.target === pageId)

export type PageLink = { from: string; to: string; edge: FlowEdge }

export const PAGE_LINKS: readonly PageLink[] = [
  [START_ID, 'journey.home'],
  ['journey.home', 'journey.product'],
  ['journey.product', 'journey.cart'],
  ['journey.cart', 'journey.checkout'],
].flatMap(([from = '', to = '']) => {
  const edge = wayInto(to)
  return edge ? [{ from, to, edge }] : []
})
