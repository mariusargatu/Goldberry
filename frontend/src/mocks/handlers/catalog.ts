import { http, HttpResponse } from 'msw'
import {
  API_BASE_URL,
  apiSchemas,
  type Product,
  type ProductSummary,
} from '../../api'
import type { ProductFixture } from '../fixtures/products'
import { problemResponse } from '../problem'
import { allProducts, findProduct } from '../store'

function toSummary(product: ProductFixture): ProductSummary {
  const { id, name, artist, price, stock, editionSize, image } = product
  return { id, name, artist, price, stock, editionSize, image }
}

function toProduct(product: ProductFixture): Product {
  const { description, material, heightCm, gallery } = product
  return { ...toSummary(product), description, material, heightCm, gallery }
}

export function catalogHandlers() {
  return [
    http.get(`${API_BASE_URL}/products`, () =>
      HttpResponse.json(allProducts().map(toSummary)),
    ),

    http.get<{ productId: string }>(
      `${API_BASE_URL}/products/:productId`,
      ({ params }) => {
        const valid = apiSchemas.GetProductParams.safeParse(params).success
        const product = valid ? findProduct(params.productId) : undefined
        if (!product) {
          return problemResponse(
            404,
            'not_found',
            `No product with id "${params.productId}".`,
          )
        }
        return HttpResponse.json(toProduct(product))
      },
    ),
  ]
}
