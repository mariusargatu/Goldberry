import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  parseRoute,
  pathFor,
  routeFor,
  type JourneySnapshot,
} from '../../flows'
import { useJourneyActorRef, useJourneySelector } from './JourneyProvider'

function pathOf(snapshot: JourneySnapshot): string | null {
  const route = routeFor(snapshot)
  return route ? pathFor(route) : null
}

/**
 * Keeps the URL and the journey machine in step.
 * - URL → machine: each URL change becomes one NAVIGATE, unless the machine
 *   already shows that path (e.g. the URL just followed the machine).
 * - machine → URL: whenever the machine shows another path, the URL is replaced
 *   to match: a NAVIGATE that settled elsewhere (an unknown link lands on home,
 *   /checkout with an empty bag lands on the bag), async results (an unknown
 *   piece or order goes home), or the actor starting on first load.
 * The machine side is always read from the live snapshot: the selected path
 * from this render is stale right after effect 1 sends.
 */
export function RouteSync() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const actorRef = useJourneyActorRef()
  // Subscribing re-renders RouteSync whenever the machine's path changes.
  const machinePath = useJourneySelector(pathOf)
  // The URL effect 1 last handled. StrictMode runs effects twice for the same
  // URL; when the machine settled on another path, comparing
  // paths alone would send that NAVIGATE again.
  const handledPath = useRef<string | null>(null)

  useEffect(() => {
    const urlPath = `${pathname}${search}`
    if (handledPath.current === urlPath) return
    handledPath.current = urlPath
    if (pathOf(actorRef.getSnapshot()) === urlPath) return
    actorRef.send({ type: 'NAVIGATE', route: parseRoute(pathname) })
  }, [actorRef, pathname, search])

  useEffect(() => {
    const livePath = pathOf(actorRef.getSnapshot())
    if (livePath !== null && livePath !== `${pathname}${search}`) {
      navigate(livePath, { replace: true })
    }
  }, [actorRef, machinePath, navigate, pathname, search])

  return null
}
