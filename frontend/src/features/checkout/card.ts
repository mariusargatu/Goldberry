/** Error message per field; absent fields are valid. */
export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

export function hasErrors(errors: FieldErrors<string>): boolean {
  return Object.keys(errors).length > 0
}

/** The card form's fields. They never leave the browser: only a token does. */
export type CardDetails = {
  number: string
  expiry: string
  cvc: string
  name: string
}
export type CardField = keyof CardDetails

/** Stands in for a payment provider's token: every valid card is approved. */
export const PAYMENT_TOKEN = 'tok_visa'
const MIN_CARD_DIGITS = 13
const MAX_CARD_DIGITS = 19
const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/
const CVC_PATTERN = /^\d{3,4}$/

function digitsOf(value: string): string {
  return value.replace(/\D/g, '')
}

function passesLuhn(digits: string): boolean {
  const sum = [...digits].reverse().reduce((total, char, index) => {
    const digit = Number(char)
    if (index % 2 === 0) return total + digit
    const doubled = digit * 2
    return total + (doubled > 9 ? doubled - 9 : doubled)
  }, 0)
  return sum % 10 === 0
}

/** Format checks only: "is it expired" would need today's date. */
export function validateCard(card: CardDetails): FieldErrors<CardField> {
  const digits = digitsOf(card.number)
  const validNumber =
    digits.length >= MIN_CARD_DIGITS &&
    digits.length <= MAX_CARD_DIGITS &&
    passesLuhn(digits)
  return {
    ...(validNumber ? {} : { number: 'Enter a valid card number.' }),
    ...(EXPIRY_PATTERN.test(card.expiry.trim())
      ? {}
      : { expiry: 'Use MM / YY.' }),
    ...(CVC_PATTERN.test(card.cvc.trim())
      ? {}
      : { cvc: 'Enter the 3 or 4 digits on the back.' }),
    ...(card.name.trim() ? {} : { name: 'Enter the name on the card.' }),
  }
}

/** Formats expiry digits while typing: "1230" → "12 / 30". */
export function formatExpiry(value: string): string {
  const digits = digitsOf(value).slice(0, 4)
  return digits.length > 2
    ? `${digits.slice(0, 2)} / ${digits.slice(2)}`
    : digits
}

/** Groups digits in fours for display: "4242424242424242" → "4242 4242 4242 4242". */
export function formatCardNumber(value: string): string {
  return digitsOf(value)
    .slice(0, MAX_CARD_DIGITS)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}
