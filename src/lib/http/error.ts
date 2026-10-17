import axios from 'axios'

import { errorBodySchema } from '@/contracts/errors.ts'

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const parsed = errorBodySchema.safeParse(error.response?.data)
    if (parsed.success) {
      return parsed.data.message
    }
  }
  return fallback
}

export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404
}

export function isAbortError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false
  }
  if (error.response?.status === 499) {
    return true
  }
  return error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED'
}

export function apiErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null
  }
  const parsed = errorBodySchema.safeParse(error.response?.data)
  if (parsed.success) {
    return parsed.data.code
  }
  return null
}

export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) {
    return {}
  }
  const parsed = errorBodySchema.safeParse(error.response?.data)
  if (parsed.success && parsed.data.fieldErrors) {
    return parsed.data.fieldErrors
  }
  return {}
}
