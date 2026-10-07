import { ApiError } from './api-error'
import { API_BASE_URL } from './config'
import type { Problem } from './contract'

function isProblem(value: unknown): value is Problem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'code' in value &&
    'title' in value
  )
}

/**
 * Fetch wrapper behind every generated API function (orval mutator).
 * Resolves with the parsed JSON body on 2xx; throws ApiError otherwise. The
 * fallback messages are plain words because pages show them to shoppers.
 */
export async function httpClient<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Accept'))
    headers.set('Accept', 'application/json, application/problem+json')

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch (error) {
    // Aborts end up here too; the journey's actors ignore errors once aborted.
    throw new ApiError(0, null, "The server didn't respond.", { cause: error })
  }

  // null for an empty or non-JSON body, e.g. an HTML page from a proxy, which
  // is an error even with a 2xx status.
  const body: unknown = await response.json().catch(() => null)
  if (response.ok && body !== null) return body as T
  const problem = isProblem(body) ? body : null
  throw new ApiError(
    response.status,
    problem,
    problem?.title ?? `Something went wrong (${response.status}).`,
  )
}
