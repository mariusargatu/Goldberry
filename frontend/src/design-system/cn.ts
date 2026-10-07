import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the custom scales from tokens.css; otherwise
// `text-headline-lg` is mistaken for a text color and dropped next to
// `text-on-surface`. Add a name here when you add one to tokens.css.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'headline-xl',
        'headline-xl-mobile',
        'headline-lg',
        'headline-md',
        'headline-sm',
        'body-lg',
        'body-md',
        'body-sm',
        'label-lg',
        'label-md',
        'label-sm',
        'code-sm',
        // The flow inspector's scale, and its model's (inspector-theme.css).
        'insp-sm',
        'insp-md',
        'model-title',
        'model-label',
        'model-note',
      ],
      spacing: [
        'space-xs',
        'space-sm',
        'space-md',
        'space-lg',
        'space-xl',
        'gutter',
        'gutter-mobile',
      ],
      // The flow inspector's corners and its one shadow (inspector-theme.css).
      radius: ['insp', 'insp-sm', 'insp-card', 'model'],
      shadow: ['insp-raised', 'model', 'model-here'],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
