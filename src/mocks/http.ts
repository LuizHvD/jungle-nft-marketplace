import { HttpResponse } from 'msw'
import { errorBodySchema, type ErrorBody } from '../contracts/errors.ts'
import { ApiError } from './errors.ts'

export function jsonError(error: ApiError): Response {
  const body: ErrorBody = {
    code: error.code,
    message: error.message,
    ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
  }
  return HttpResponse.json(errorBodySchema.parse(body), {
    status: error.status,
  })
}

export function jsonData<T extends Record<string, unknown>>(
  schema: { parse: (data: unknown) => T },
  data: T,
): Response {
  return HttpResponse.json(schema.parse(data))
}

export async function hangUntilAbort(request: Request): Promise<Response> {
  await new Promise<void>((resolve) => {
    if (request.signal.aborted) {
      resolve()
      return
    }
    request.signal.addEventListener('abort', () => resolve(), { once: true })
  })
  return new HttpResponse(null, { status: 499 })
}
