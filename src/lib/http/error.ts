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
