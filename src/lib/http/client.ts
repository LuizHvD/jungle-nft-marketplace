import axios, { type InternalAxiosRequestConfig } from 'axios'

import { errorBodySchema } from '@/contracts/errors.ts'
import { queryClient } from '@/app/query-client.ts'
import { safeReturnTo } from '@/lib/session/return-to.ts'
import { readGuestId } from '@/lib/commerce/guest-id.ts'
import { readStoredToken } from '@/lib/session/storage.ts'
import { handleUnauthorized } from '@/lib/session/unauthorized.ts'

export const http = axios.create({
  baseURL: '/api',
})

declare module 'axios' {
  interface AxiosRequestConfig {
    authToken?: string
  }

  interface InternalAxiosRequestConfig {
    authToken?: string
  }
}

function bearerToken(value: string): string | null {
  const [scheme, token] = value.split(' ')
  if (scheme?.toLowerCase() === 'bearer' && token) {
    return token
  }
  return null
}

function authorizationHeader(config: InternalAxiosRequestConfig): string | null {
  const headers = config.headers
  const fromAxios = headers.get('Authorization')
  if (typeof fromAxios === 'string') {
    return fromAxios
  }
  return null
}

http.interceptors.request.use((config) => {
  const explicit = authorizationHeader(config)
  const pinned = explicit ? bearerToken(explicit) : null
  if (pinned) {
    config.authToken = pinned
    return config
  }
  const stored = readStoredToken()
  if (stored) {
    config.headers.set('Authorization', `Bearer ${stored}`)
    config.authToken = stored
    return config
  }
  config.headers.set('x-guest-id', readGuestId())
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error)
    }
    const config = error.config
    const requestToken = config?.authToken ?? null
    const parsed = errorBodySchema.safeParse(error.response.data)
    const returnTo =
      typeof window === 'undefined'
        ? '/'
        : safeReturnTo(`${window.location.pathname}${window.location.search}`)
    handleUnauthorized(
      {
        method: config?.method ?? '',
        url: config?.url ?? '',
        requestToken,
        currentToken: readStoredToken(),
        code: parsed.success ? parsed.data.code : null,
      },
      queryClient,
      returnTo,
    )
    return Promise.reject(error)
  },
)
