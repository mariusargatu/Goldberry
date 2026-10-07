import type { Problem } from './contract'

/**
 * Thrown by every API call for a non-2xx response, a response without a JSON
 * body, or a network failure.
 */
export class ApiError extends Error {
  /** HTTP status, or 0 when the request never got a response. */
  readonly status: number
  /** RFC 9457 Problem Details body, when the server sent one. */
  readonly problem: Problem | null

  constructor(
    status: number,
    problem: Problem | null,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}
