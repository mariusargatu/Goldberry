import type { ProductSummary } from '../../api'
import { Skeleton } from '../../design-system'
import { ProductCard } from './ProductCard'

const GRID =
  'grid grid-cols-2 gap-x-space-md gap-y-space-xl sm:grid-cols-3 lg:grid-cols-4'

export function ProductGrid({
  products,
}: {
  products: readonly ProductSummary[]
}) {
  return (
    <ul className={GRID}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}

export function ProductGridSkeleton({ count }: { count: number }) {
  return (
    <ul className={GRID} aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex flex-col gap-space-sm">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </li>
      ))}
    </ul>
  )
}
