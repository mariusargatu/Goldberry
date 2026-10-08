import type { ReactNode } from 'react'
import type { ProductSummary } from '../../api'
import { Badge, PageContainer, Skeleton, cn } from '../../design-system'
import type { HomeData } from '../../flows'
import { useJourneySelector } from '../journey/JourneyProvider'
import { useJourneyStep, type StepOf } from '../shared/journey-step'
import { ProductGrid, ProductGridSkeleton } from '../shared/ProductGrid'

/** The shop's four pieces: as many skeletons while they load. */
const PIECES = 4

/** The featured pieces' art, staggered, as the hero's picture; skeletons while it loads. */
function HeroArt({ featured }: { featured: readonly ProductSummary[] | null }) {
  const tiles =
    featured?.slice(0, PIECES) ?? Array.from({ length: PIECES }, () => null)
  return (
    <div
      aria-hidden
      className="hidden grid-cols-2 gap-space-md pb-space-lg lg:grid"
    >
      {tiles.map((product, index) => {
        const tile = cn(
          'aspect-square w-full rounded-xl',
          index % 2 === 1 && 'translate-y-space-lg',
        )
        return product ? (
          <img
            key={product.id}
            src={product.image.url}
            alt=""
            className={cn(tile, 'object-cover shadow-sm')}
          />
        ) : (
          <Skeleton key={index} className={tile} />
        )
      })}
    </div>
  )
}

function Hero({ art }: { art: ReactNode }) {
  return (
    <section className="grid items-center gap-space-xl rounded-xl bg-surface-container-low p-space-lg md:p-space-xl lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="flex flex-col items-start gap-space-lg">
        <Badge variant="edition">New drops every month</Badge>
        <h1 className="max-w-2xl text-headline-xl-mobile text-primary md:text-headline-xl">
          Collectible art toys, cast in small editions.
        </h1>
        <p className="max-w-xl text-body-lg text-on-surface-variant">
          Designer vinyl, porcelain and resin figures from independent artists.
          Every piece is numbered.
        </p>
      </div>
      {art}
    </section>
  )
}

/** The pieces; skeletons until the data is there. */
function Catalog({ home }: { home: HomeData | null }) {
  return (
    <section
      className="flex flex-col gap-space-lg"
      aria-labelledby="featured-heading"
    >
      <h2 id="featured-heading" className="text-headline-md text-primary">
        Featured editions
      </h2>
      {home ? (
        <ProductGrid products={home.featured} />
      ) : (
        <ProductGridSkeleton count={PIECES} />
      )}
    </section>
  )
}

export function HomePage() {
  const step = useJourneyStep('home')
  const home = useJourneySelector((snapshot) => snapshot.context.home)
  const ready = step === 'ready' ? home : null
  const art = {
    loading: <HeroArt featured={null} />,
    ready: ready && <HeroArt featured={ready.featured} />,
  } satisfies Record<StepOf<'home'>, ReactNode>
  const content = {
    loading: <Catalog home={null} />,
    ready: <Catalog home={ready} />,
  } satisfies Record<StepOf<'home'>, ReactNode>

  return (
    <PageContainer className="flex flex-col gap-space-xl py-space-xl">
      <Hero art={art[step]} />
      {content[step]}
    </PageContainer>
  )
}
