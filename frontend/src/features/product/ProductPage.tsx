import type { ReactNode } from 'react'
import { PageContainer, Skeleton } from '../../design-system'
import { useJourneySelector } from '../journey/JourneyProvider'
import { useJourneyStep, type StepOf } from '../shared/journey-step'
import { ProductDetails } from './ProductDetails'

function ProductSkeleton() {
  return (
    <div className="grid gap-space-xl lg:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="flex flex-col gap-space-md">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

export function ProductPage() {
  const step = useJourneyStep('product')
  const product = useJourneySelector((snapshot) => snapshot.context.product)
  const details = product && <ProductDetails product={product} />
  const content = {
    loading: <ProductSkeleton />,
    ready: details,
    inBag: details,
  } satisfies Record<StepOf<'product'>, ReactNode>

  return <PageContainer className="py-space-xl">{content[step]}</PageContainer>
}
