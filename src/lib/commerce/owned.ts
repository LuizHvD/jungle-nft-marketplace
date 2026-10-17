import type { QueryClient } from '@tanstack/react-query'
import type { z } from 'zod'

import type { CartResponse } from '@/contracts/cart.ts'
import { favoritesSchema } from '@/contracts/favorites.ts'
import { actorStillCurrent, type ActorStamp } from '@/lib/session/owned-cache.ts'
import { readStoredSession } from '@/lib/session/storage.ts'

export type Favorites = z.infer<typeof favoritesSchema>

import { peekGuestId } from './guest-id.ts'

export type CartStamp =
  | { kind: 'user'; userId: string; token: string }
  | { kind: 'guest'; guestId: string }

export function readCartStamp(): CartStamp | null {
  const session = readStoredSession()
  if (session) {
    return { kind: 'user', userId: session.user.id, token: session.token }
  }
  const guestId = peekGuestId()
  if (!guestId) {
    return null
  }
  return { kind: 'guest', guestId }
}

export function cartActorId(stamp: CartStamp): string {
  if (stamp.kind === 'user') {
    return stamp.userId
  }
  return `guest:${stamp.guestId}`
}

export function cartStampCurrent(stamp: CartStamp): boolean {
  if (stamp.kind === 'user') {
    return actorStillCurrent({ userId: stamp.userId, token: stamp.token })
  }
  if (readStoredSession()) {
    return false
  }
  return peekGuestId() === stamp.guestId
}

export function commitOwnedCart(
  client: QueryClient,
  stamp: CartStamp,
  cart: CartResponse,
): boolean {
  if (!cartStampCurrent(stamp) || cart.actorId !== cartActorId(stamp)) {
    return false
  }
  client.setQueryData(['cart', cart.actorId], cart)
  return true
}

export function commitOwnedFavorites(
  client: QueryClient,
  stamp: ActorStamp,
  favorites: Favorites,
): boolean {
  if (!actorStillCurrent(stamp)) {
    return false
  }
  client.setQueryData(['favorites', stamp.userId], favorites)
  return true
}
