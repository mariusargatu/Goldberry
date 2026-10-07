import { defineConfig } from 'orval'

// The contract lives in ../contracts/openapi.yaml (same repository). The
// output in src/api/generated is committed, so the app builds without running
// orval; run `pnpm gen:api` after editing the contract.
const CONTRACT = '../contracts/openapi.yaml'

export default defineConfig({
  client: {
    input: { target: CONTRACT },
    output: {
      // split: types and enums go to client.schemas.ts, which has no imports,
      // so src/api/contract.ts can expose them to Node-side code.
      mode: 'split',
      target: 'src/api/generated/client.ts',
      client: 'fetch',
      // Typed header params, e.g. createOrder(body, { 'Idempotency-Key': key }).
      headers: true,
      formatter: 'prettier',
      override: {
        // Every generated function calls httpClient, which resolves with the
        // body on 2xx and throws ApiError otherwise.
        mutator: { path: 'src/api/http-client.ts', name: 'httpClient' },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
  zod: {
    input: { target: CONTRACT },
    output: {
      mode: 'single',
      target: 'src/api/generated/schemas.zod.ts',
      client: 'zod',
      formatter: 'prettier',
      override: {
        // Only request schemas are used (by the flows and the mocks); nothing
        // validates responses at runtime.
        zod: {
          generate: {
            param: true,
            query: true,
            header: true,
            body: true,
            response: false,
          },
        },
      },
    },
  },
})
