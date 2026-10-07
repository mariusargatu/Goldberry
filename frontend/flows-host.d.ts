// The host APIs src/flows may use beyond ES2023, for tsconfig.flows.json only.
// Browsers and Node both provide them; anything else (DOM, storage, fetch,
// timers) fails to compile there. Kept outside src/ so the app config, which
// has the real DOM types, never sees these declarations.

declare class URLSearchParams {
  constructor(init?: string)
  get(name: string): string | null
  set(name: string, value: string): void
  toString(): string
}

declare const console: {
  error(...data: unknown[]): void
}
