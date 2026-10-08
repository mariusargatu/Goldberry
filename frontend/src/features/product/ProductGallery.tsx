import { useState } from 'react'
import type { ProductImage } from '../../api'
import { cn } from '../../design-system'

export function ProductGallery({
  images,
}: {
  images: readonly ProductImage[]
}) {
  const [selected, setSelected] = useState(0)
  const main = images[selected] ?? images[0]
  if (!main) return null

  return (
    <div className="flex flex-col gap-space-md">
      <div className="aspect-square overflow-hidden rounded-xl bg-surface-container-low">
        <img src={main.url} alt={main.alt} className="size-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-space-sm">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              aria-label={`Show image ${index + 1}: ${image.alt}`}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              className={cn(
                'size-20 overflow-hidden rounded-lg bg-surface-container-low ring-2 transition-shadow',
                index === selected
                  ? 'ring-primary'
                  : 'ring-transparent hover:ring-outline-variant',
              )}
            >
              <img src={image.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
