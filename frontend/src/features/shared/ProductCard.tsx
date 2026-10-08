import type { ProductSummary } from '../../api'
import { Badge } from '../../design-system'
import { JourneyLink } from '../journey/JourneyLink'
import { formatMoney } from './format'

export function ProductCard({ product }: { product: ProductSummary }) {
  const soldOut = product.stock === 0
  return (
    <JourneyLink
      route={{ name: 'product', productId: product.id }}
      data-testid="product-card"
      className="group flex flex-col gap-space-sm rounded-xl outline-offset-4"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-container-low">
        {/* The link's text already names the piece; alt text would repeat it. */}
        <img
          src={product.image.url}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {soldOut && (
          <Badge
            variant="pill"
            className="absolute top-space-sm left-space-sm bg-surface-container-lowest"
          >
            Sold out
          </Badge>
        )}
      </div>
      <div className="flex flex-col">
        <span className="truncate text-headline-sm text-primary">
          {product.name}
        </span>
        <div className="flex items-baseline justify-between gap-space-sm">
          <span className="truncate text-body-sm text-on-surface-variant">
            {product.artist}
          </span>
          <span className="text-label-lg text-primary">
            {formatMoney(product.price)}
          </span>
        </div>
      </div>
      <Badge variant="tag" className="self-start">
        Edition of {product.editionSize}
      </Badge>
    </JourneyLink>
  )
}
