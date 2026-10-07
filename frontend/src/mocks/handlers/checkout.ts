import { http, HttpResponse } from 'msw'
import { API_BASE_URL, apiSchemas, type Order } from '../../api'
import { priceCart } from '../pricing'
import { invalid, problemResponse, readJson } from '../problem'
import {
  decrementStock,
  findOrder,
  nextOrderNumber,
  resolveLines,
  saveOrder,
} from '../store'

const UNKNOWN_PRODUCTS = 'The cart contains unknown products.'

export function checkoutHandlers() {
  return [
    http.post(`${API_BASE_URL}/checkout/quote`, async ({ request }) => {
      const parsed = apiSchemas.CreateQuoteBody.safeParse(
        await readJson(request),
      )
      if (!parsed.success)
        return invalid('The quote request is invalid.', parsed.error)
      const resolved = resolveLines(parsed.data.items)
      if (!resolved.ok) return invalid(UNKNOWN_PRODUCTS, resolved.errors)
      return HttpResponse.json(priceCart(resolved.lines))
    }),

    http.post(`${API_BASE_URL}/orders`, async ({ request }) => {
      const parsed = apiSchemas.CreateOrderBody.safeParse(
        await readJson(request),
      )
      if (!parsed.success) return invalid('The order is invalid.', parsed.error)
      const { items, shippingAddress } = parsed.data
      const resolved = resolveLines(items)
      if (!resolved.ok) return invalid(UNKNOWN_PRODUCTS, resolved.errors)

      const order: Order = {
        id: crypto.randomUUID(),
        number: nextOrderNumber(),
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        lines: resolved.lines.map(({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          quantity,
          unitPrice: product.price,
          image: product.image,
        })),
        shippingAddress,
        pricing: priceCart(resolved.lines),
      }
      decrementStock(resolved.lines)
      saveOrder(order)
      return HttpResponse.json(order, { status: 201 })
    }),

    http.get<{ orderId: string }>(
      `${API_BASE_URL}/orders/:orderId`,
      ({ params }) => {
        const valid = apiSchemas.GetOrderParams.safeParse(params).success
        const order = valid ? findOrder(params.orderId) : undefined
        if (!order) {
          return problemResponse(
            404,
            'not_found',
            `No order with id "${params.orderId}".`,
          )
        }
        return HttpResponse.json(order)
      },
    ),
  ]
}
