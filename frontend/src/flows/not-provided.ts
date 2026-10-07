/** Default for the machines' named actors: the app (or a test tool) supplies the real ones via `machine.provide()`. */
export function notProvided(name: string): Promise<never> {
  return Promise.reject(new Error(`Actor "${name}" was not provided`))
}
