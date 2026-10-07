/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `mock` (default) serves the API from MSW in the browser; `live` calls VITE_API_BASE_URL. */
  readonly VITE_API_MODE?: 'mock' | 'live'
  /** API origin + prefix. Defaults to `/api`. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
