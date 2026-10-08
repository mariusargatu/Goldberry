import type { Product } from '../../api'
import { hasBug } from '../../bugs'
import { Badge } from '../../design-system'
import { formatMoney } from '../shared/format'
import { AddToBag } from './AddToBag'
import { ProductGallery } from './ProductGallery'

const LOW_STOCK_THRESHOLD = 3

function stockLabel(stock: number): string {
  if (stock === 0) return 'Sold out'
  if (stock <= LOW_STOCK_THRESHOLD) return `Only ${stock} left`
  return 'In stock'
}

export function ProductDetails({ product }: { product: Product }) {
  return (
    <div className="grid gap-space-xl lg:grid-cols-2">
      <ProductGallery images={product.gallery} />
      <div className="flex flex-col gap-space-lg">
        <div className="flex flex-col gap-space-sm">
          <h1 className="text-headline-lg text-primary">{product.name}</h1>
          <p className="text-body-lg text-on-surface-variant">
            by {product.artist}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-md">
          <span className="text-headline-md text-primary">
            {formatMoney(product.price)}
          </span>
          <Badge variant="pill">{stockLabel(product.stock)}</Badge>
          <Badge variant="tag">
            Edition of{' '}
            {hasBug('edition-nan') ? Number.NaN : product.editionSize}
          </Badge>
        </div>
        <AddToBag product={product} />
        <p className="text-body-lg text-on-surface">{product.description}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-space-lg gap-y-space-sm rounded-xl bg-surface-container-low p-space-lg text-body-md">
          <dt className="text-on-surface-variant">Material</dt>
          <dd className="text-primary">{product.material}</dd>
          <dt className="text-on-surface-variant">Height</dt>
          <dd className="text-primary">{product.heightCm} cm</dd>
          <dt className="text-on-surface-variant">Edition size</dt>
          <dd className="text-primary">{product.editionSize} pieces</dd>
        </dl>
      </div>
    </div>
  )
}
