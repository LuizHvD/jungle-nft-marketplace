import type { ErrorBody } from '../contracts/errors.ts'

export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorBody['code']
  readonly fieldErrors?: Record<string, string>

  constructor(
    status: number,
    code: ErrorBody['code'],
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}
