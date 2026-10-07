import { apiSchemas } from '../api/contract'

/**
 * What PLACE_ORDER carries. Card details stay in the form: only a payment
 * token reaches the machine or the API.
 */
export type PaymentDetails = {
  paymentToken: string
}

/** What the machine accepts for PLACE_ORDER: a well-formed token. */
export function isValidPayment(payment: PaymentDetails): boolean {
  return apiSchemas.createOrderBodyPaymentTokenRegExp.test(payment.paymentToken)
}
