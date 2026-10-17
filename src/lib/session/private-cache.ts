import type { Query, QueryClient } from '@tanstack/react-query'

export const sessionQueryKey = ['session'] as const

const privateQueryRoots = [
  'session',
  'profile',
  'wallets',
  'favorites',
  'orders',
  'cart',
  'quote',
] as const

export function isPrivateQueryKey(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0]
  if (typeof root !== 'string') {
    return false
  }
  return (privateQueryRoots as readonly string[]).includes(root)
}

function isPrivateQuery(query: Query): boolean {
  return isPrivateQueryKey(query.queryKey)
}

export function clearPrivateCache(client: QueryClient): void {
  void client.cancelQueries({ predicate: isPrivateQuery })
  client.removeQueries({ predicate: isPrivateQuery })
}
