import { useEffect, useRef } from 'react'

/**
 * Focuses the returned element when `shown` turns true (never on mount), so
 * keyboard focus follows the checkout when it swaps one section for another.
 */
export function useFocusWhenShown<T extends HTMLElement>(shown: boolean) {
  const ref = useRef<T>(null)
  const wasShown = useRef(shown)
  useEffect(() => {
    if (shown && !wasShown.current) ref.current?.focus()
    wasShown.current = shown
  }, [shown])
  return ref
}

/** Moves focus to the first field marked invalid, if there is one. */
export function focusFirstInvalid(form: HTMLFormElement | null): void {
  form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}
