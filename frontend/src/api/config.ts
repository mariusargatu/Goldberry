/** API prefix or origin, read at build time (see vite-env.d.ts). */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || '/api'
).replace(/\/+$/, '')
