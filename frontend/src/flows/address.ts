import { apiSchemas, type ShippingAddress } from '../api/contract'

/** Same rules the API enforces, straight from the contract. */
const AddressSchema = apiSchemas.CreateOrderBody.shape.shippingAddress

export function isValidAddress(address: ShippingAddress): boolean {
  return AddressSchema.safeParse(address).success
}
