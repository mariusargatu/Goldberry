import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { pathFor, type Route } from '../../flows'

type JourneyLinkProps = Omit<ComponentProps<typeof Link>, 'to'> & {
  route: Exclude<Route, { name: 'notFound' }>
}

/**
 * A link to a journey page. RouteSync turns following it into a NAVIGATE, so
 * it carries the `data-flow-event` hook test tools look for.
 */
export function JourneyLink({ route, ...props }: JourneyLinkProps) {
  return <Link to={pathFor(route)} data-flow-event="NAVIGATE" {...props} />
}
