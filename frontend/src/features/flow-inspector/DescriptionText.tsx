import { cn } from '../../design-system'
import type { TextBlock } from './descriptions'

export function DescriptionText({
  text,
  className,
  leadClass = 'text-insp-soft',
}: {
  text: readonly TextBlock[]
  className?: string
  leadClass?: string
}) {
  return (
    <div className={cn('max-w-60 text-model-label text-pretty', className)}>
      {text.map((block, index) => (
        <p
          key={index}
          className={cn(
            index > 0 && (block.kind === 'bullet' ? 'mt-0.5' : 'mt-1.5'),
            block.kind === 'lead' && ['font-medium', leadClass],
            block.kind === 'bullet' &&
              "relative pl-3.5 before:absolute before:left-0 before:text-insp-dim before:content-['•']",
          )}
        >
          {block.text}
        </p>
      ))}
    </div>
  )
}
