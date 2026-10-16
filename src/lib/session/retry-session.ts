import axios from 'axios'

export function retrySessionQuery(failureCount: number, error: unknown): boolean {
  if (failureCount > 0) {
    return false
  }
  if (!axios.isAxiosError(error)) {
    return true
  }
  const status = error.response?.status
  if (status === undefined) {
    return true
  }
  return status >= 500
}
