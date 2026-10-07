# Goldberry API contract

[`openapi.yaml`](openapi.yaml) (OpenAPI 3.1) is the single source of truth for
the Goldberry storefront API. The frontend's typed client and request schemas
are generated from it, the frontend's mocks serve it, and the backend will
implement it. Change the contract first, then the code on both sides.

## Operations

The server base path is `/api`.

| `operationId`  | Request                     | Responses        |
| -------------- | --------------------------- | ---------------- |
| `listProducts` | `GET /products`             | 200 every piece  |
| `getProduct`   | `GET /products/{productId}` | 200 product, 404 |
| `createQuote`  | `POST /checkout/quote`      | 200 quote        |
| `createOrder`  | `POST /orders`              | 201 order        |
| `getOrder`     | `GET /orders/{orderId}`     | 200 order, 404   |

Every operation also declares a default error response.

## Conventions

- **Errors** are [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) Problem
  Details (`application/problem+json`) with `type`, `title`, `status`, an
  optional `detail`, and a machine-readable `code`: `not_found`,
  `validation_failed` or `internal_error`. Clients branch on `code`, never on
  the title. Field-level problems add
  `errors: [{ field, message }]`, where `field` is a dotted path into the
  request body, such as `shippingAddress.postalCode`.
- **Success responses** are plain resources, with no envelope.
- **Ids:** product ids are slugs (`^[a-z0-9-]{1,64}$`, such as `neon-oni`);
  order ids are UUIDs. Orders also have a human-readable `number`, such as
  `GB-100042`.
- **Money** is an integer amount in minor units (cents) with a `currency`,
  always `USD` for now.
- **Payments:** card data never appears in the contract. An order carries a
  `paymentToken` (`^tok_[a-z0-9_]+$`) from the payment provider.
- **Shipping** is within the US only: a two-letter state, a five-digit ZIP
  code and the country `US`.
- **The cart** is client-side; there are no cart endpoints.

## How the frontend consumes it

[orval](https://orval.dev) (configured in `frontend/orval.config.ts`)
generates a typed `fetch` client, the types and enums, and zod schemas for
request parameters and bodies into `frontend/src/api/generated/`. The
generated files are committed, so the frontend builds without running orval.

After editing `openapi.yaml`:

```sh
cd frontend
pnpm gen:api
pnpm typecheck
```

Then commit the contract and the regenerated files together. The frontend's
mocks validate requests with the same generated schemas; see
[`frontend/README.md`](../frontend/README.md#api) for how the client is used.

## Backend

[`backend/`](../backend/) will implement this contract. It is not built yet;
until then the frontend serves the contract from in-browser mocks.
