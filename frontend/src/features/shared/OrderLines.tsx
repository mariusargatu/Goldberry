import type { Money, ProductImage } from '../../api'
import { Badge } from '../../design-system'
import { formatLineTotal } from './format'

type OrderLineView = {
  productId: string
  name: string
  quantity: number
  unitPrice: Money
  image: ProductImage
}

/** Compact list of bag or order lines with thumbnails. */
export function OrderLines({ lines }: { lines: readonly OrderLineView[] }) {
  return (
    <ul className="flex flex-col gap-space-sm">
      {lines.map((line) => (
        <li
          key={line.productId}
          className="flex items-center gap-space-md rounded-xl bg-surface-container-lowest p-space-sm shadow-sm"
        >
          <span className="relative shrink-0">
            <img
              src={line.image.url}
              alt={line.image.alt}
              className="size-16 rounded-lg bg-surface-container-low object-cover"
            />
            <Badge
              variant="count"
              className="absolute -top-1 -right-1"
              aria-label={`Quantity ${line.quantity}`}
            >
              {line.quantity}
            </Badge>
          </span>
          <span className="min-w-0 flex-1 truncate text-label-lg text-primary">
            {line.name}
          </span>
          <span className="text-label-lg text-primary">
            {formatLineTotal(line)}
          </span>
        </li>
      ))}
    </ul>
  )
}
