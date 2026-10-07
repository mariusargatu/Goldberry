import { HttpResponse } from 'msw'
import type { z } from 'zod'
import type { FieldError, Problem, ProblemCode } from '../api'

const TITLES: Record<ProblemCode, string> = {
  not_found: 'Not found',
  validation_failed: 'The request is invalid',
  internal_error: 'Something went wrong',
}

/** RFC 9457 Problem Details response. */
export function problemResponse(
  status: number,
  code: ProblemCode,
  detail?: string,
  errors?: readonly FieldError[],
) {
  const body: Problem = {
    type: `/problems/${code}`,
    title: TITLES[code],
    status,
    code,
    ...(detail ? { detail } : {}),
    ...(errors && errors.length > 0 ? { errors: [...errors] } : {}),
  }
  return HttpResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

/** Field-level errors; issues about the whole body (empty path) are left to `detail`. */
function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues
    .filter((issue) => issue.path.length > 0)
    .map((issue) => ({
      field: issue.path.map(String).join('.'),
      message: issue.message,
    }))
}

/** 422 for a request that failed schema validation or the mock's own checks. */
export function invalid(
  detail: string,
  errors: z.ZodError | readonly FieldError[],
) {
  const fieldErrors = 'issues' in errors ? toFieldErrors(errors) : errors
  return problemResponse(422, 'validation_failed', detail, fieldErrors)
}

/** Parses a JSON request body; malformed JSON becomes undefined and fails validation. */
export function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => undefined)
}
