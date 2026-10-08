import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { hasBug } from '../bugs'
import { Badge, Icon, buttonStyles, cn } from '../design-system'
import { cartCount } from '../flows'
import { useJourneySelector } from '../features/journey/JourneyProvider'
import { JourneyLink } from '../features/journey/JourneyLink'
import { BAG_LINK_ID, landingInBag } from '../features/shared/fly-to-bag'
import { plural } from '../features/shared/format'

/**
 * A gold berry with a leaf, then the name. public/favicon.svg draws a
 * lighter-leaf variant, since this dark leaf would vanish on its black tile.
 */
function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center gap-2 text-headline-sm font-extrabold tracking-tight text-primary',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-[1.4em] shrink-0">
        <path
          d="M12 7c0-3.6 2.4-6 6-6 0 3.6-2.4 6-6 6Z"
          className="fill-secondary"
        />
        <circle
          cx="12"
          cy="14.75"
          r="8.75"
          className="fill-secondary-container"
        />
        <circle
          cx="8.75"
          cy="11.5"
          r="2"
          className="fill-surface-container-lowest/80"
        />
      </svg>
      Goldberry
    </span>
  )
}

function BagLink() {
  const count = useJourneySelector((snapshot) =>
    hasBug('bag-count-lines')
      ? snapshot.context.cart.length
      : cartCount(snapshot.context.cart),
  )
  // The count the badge shows. Each time it goes up the badge animates once,
  // never on load: a new key remounts it, which replays the animation. When
  // a piece is flying here (fly-to-bag.ts), the old count stays up until it
  // lands, so the number changes as the piece drops in.
  const [badge, setBadge] = useState({ count, key: 0, from: count })
  useEffect(() => {
    if (count === badge.count) return
    const show = () =>
      setBadge((shown) =>
        count > shown.count
          ? { count, key: shown.key + 1, from: shown.count }
          : { ...shown, count },
      )
    const landing = count > badge.count ? landingInBag() : undefined
    if (!landing) {
      show()
      return
    }
    let waiting = true
    landing.then(() => {
      if (waiting) show()
    })
    return () => {
      waiting = false
    }
  }, [count, badge.count])
  return (
    <JourneyLink
      id={BAG_LINK_ID}
      route={{ name: 'cart' }}
      data-testid="header-bag"
      aria-label={`Bag, ${plural(count, 'item')}`}
      className={buttonStyles({ variant: 'ghost', size: 'icon' })}
    >
      <Icon name="shopping_bag" />
      {badge.count > 0 && (
        <Badge
          key={badge.key}
          variant="count"
          className={cn(
            'absolute top-1 right-1',
            // A new badge pops in; one that was already there bumps.
            badge.key > 0 &&
              (badge.from === 0 ? 'animate-bag-land' : 'animate-bag-bump'),
            'motion-reduce:animate-none',
          )}
        >
          {badge.count}
        </Badge>
      )}
    </JourneyLink>
  )
}

function SiteHeader() {
  return (
    // Stops at the flow inspector's sidebar, when it shows one (index.css).
    <header className="fixed top-0 right-(--flow-inspector-width,0px) left-0 z-40 bg-surface-container-lowest/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="flex h-20 w-full items-center justify-between gap-space-lg px-gutter-mobile md:px-gutter">
        <JourneyLink route={{ name: 'home' }} aria-label="Goldberry home">
          <Wordmark />
        </JourneyLink>
        <div className="flex items-center gap-space-sm">
          <BagLink />
        </div>
      </div>
    </header>
  )
}

/**
 * On a page change, start at the top and move focus to <main>, so keyboard and
 * screen reader users begin at the new page's content rather than on <body>
 * (the link they followed is gone). Never on first load.
 */
function useFocusMainOnPageChange() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const shownPath = useRef(pathname)
  useEffect(() => {
    window.scrollTo(0, 0)
    if (shownPath.current === pathname) return
    shownPath.current = pathname
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])
  return mainRef
}

export function AppLayout({ children }: { children: ReactNode }) {
  const mainRef = useFocusMainOnPageChange()
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        onClick={(event) => {
          // Focus <main> without adding #main to the journey's URL.
          event.preventDefault()
          mainRef.current?.focus()
        }}
        className={cn(
          buttonStyles({ variant: 'primary', size: 'sm' }),
          'fixed top-space-sm left-space-sm z-50 -translate-y-24 focus:translate-y-0',
        )}
      >
        Skip to content
      </a>
      <SiteHeader />
      {/* pt-20 clears the fixed h-20 header. */}
      <main
        ref={mainRef}
        id="main"
        tabIndex={-1}
        className="flex-1 pt-20 outline-none"
      >
        {children}
      </main>
      <footer className="mt-space-xl w-full bg-surface-container-low py-space-xl">
        <div className="flex w-full flex-col items-center gap-space-md px-gutter-mobile md:flex-row md:px-gutter">
          <Wordmark className="text-label-lg" />
          <span className="text-body-sm text-on-surface-variant">
            A demo store, no real orders · MIT licensed
          </span>
        </div>
      </footer>
    </div>
  )
}
