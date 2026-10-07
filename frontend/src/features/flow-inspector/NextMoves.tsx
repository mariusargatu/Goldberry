import { cn } from '../../design-system'
import { eitherOf, nextWords, OPEN_ANOTHER_PAGE, reasonOf } from './flow-copy'
import type { FlowView } from './flow-probe'
import { PAGE_LINKS } from './graph-model'
import { ROW_LABEL } from './ProgressReadout'
import { useNewSteps } from './useFlowView'

type Move = { words: string; reason: string | null }

function pageMovesOf(view: FlowView): Move[] {
  return PAGE_LINKS.filter((link) => link.from === view.pageId).flatMap(
    (link) =>
      view.next.exits.some(
        (exit) => exit.edgeId === link.edge.id && exit.status === 'possible',
      )
        ? [{ words: nextWords([link.edge.id]), reason: null }]
        : [],
  )
}

export function movesOf(view: FlowView): Move[] {
  const moves = view.next.rows.map((row): Move => {
    const [first] = row.exits
    const possible = row.exits.some((exit) => exit.status === 'possible')
    return {
      words: nextWords(row.exits.map((exit) => exit.edgeId)),
      reason:
        possible || !first
          ? null
          : reasonOf(first.edgeId, first.gate, view.bagEmpty),
    }
  })
  const unique = moves.filter(
    (move, index) =>
      moves.findIndex((other) => other.words === move.words) === index,
  )
  const possible = unique.filter((move) => move.reason === null)
  const reasons = [...new Set(unique.flatMap((move) => move.reason ?? []))]
  const blocked = reasons.map((reason) => ({
    words: eitherOf(
      unique.filter((move) => move.reason === reason).map((move) => move.words),
    ),
    reason,
  }))
  if (possible.length > 0) return [...possible, ...blocked]
  const pages = pageMovesOf(view)
  return [
    ...(pages.length > 0
      ? pages
      : [{ words: OPEN_ANOTHER_PAGE, reason: null }]),
    ...blocked,
  ]
}

export const moveWords = (move: Move): string =>
  move.reason ? `${move.words} (${move.reason})` : move.words

export function NextLine({ view, side }: { view: FlowView; side: boolean }) {
  const added = useNewSteps(view.steps.length)
  const moves = movesOf(view)
  if (side) {
    return (
      <dl>
        <dt className="pb-1 text-insp-sm text-insp-muted">Next</dt>
        <dd key={view.steps.length} className={cn(added > 0 && 'swap-in')}>
          <ul className="flex flex-col gap-1 text-insp-sm">
            {moves.map((move) => (
              <li
                key={move.words}
                className={move.reason ? 'text-insp-muted' : undefined}
              >
                {moveWords(move)}
              </li>
            ))}
          </ul>
        </dd>
      </dl>
    )
  }
  return (
    <dl className="flex items-baseline">
      <dt className={ROW_LABEL}>Next</dt>

      <dd
        key={view.steps.length}
        className={cn('min-w-0 overflow-hidden', added > 0 && 'swap-in')}
      >
        <ul className="-ml-5 flex flex-wrap text-insp-sm">
          {moves.map((move) => (
            <li
              key={move.words}
              className={cn(
                "flex min-w-0 before:w-5 before:shrink-0 before:text-center before:text-insp-muted before:content-['·'_/_'']",
                move.reason && 'text-insp-muted',
              )}
            >
              <span className="min-w-0">{moveWords(move)}</span>
            </li>
          ))}
        </ul>
      </dd>
    </dl>
  )
}
