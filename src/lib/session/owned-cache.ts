import type { QueryClient } from '@tanstack/react-query'

import type { SessionResponse } from '@/contracts/auth.ts'
import type { Profile } from '@/contracts/profile.ts'
import type { Wallet } from '@/contracts/wallets.ts'

import { sessionQueryKey } from './private-cache.ts'
import { readStoredSession, writeStoredSession } from './storage.ts'

export type ActorStamp = {
  userId: string
  token: string
}

export function readActorStamp(): ActorStamp | null {
  const session = readStoredSession()
  if (!session) {
    return null
  }
  return { userId: session.user.id, token: session.token }
}

export function actorStillCurrent(stamp: ActorStamp): boolean {
  const current = readStoredSession()
  return current?.user.id === stamp.userId && current.token === stamp.token
}

export function commitOwnedProfile(
  client: QueryClient,
  stamp: ActorStamp,
  profile: Profile,
  options?: { syncName?: boolean },
): boolean {
  if (!actorStillCurrent(stamp) || profile.id !== stamp.userId) {
    return false
  }
  client.setQueryData(['profile', profile.id], profile)
  if (!options?.syncName) {
    return true
  }
  const current = client.getQueryData<SessionResponse>(sessionQueryKey)
  if (current?.user.id === profile.id && current.token === stamp.token) {
    const next = {
      ...current,
      user: { ...current.user, name: profile.name },
    }
    writeStoredSession(next)
    client.setQueryData(sessionQueryKey, next)
  }
  return true
}

export function commitOwnedWallet(
  client: QueryClient,
  stamp: ActorStamp,
  wallet: Wallet,
): boolean {
  if (!actorStillCurrent(stamp)) {
    return false
  }
  client.setQueryData<{ wallets: Wallet[] }>(
    ['wallets', stamp.userId],
    (current) => {
      if (!current) {
        return { wallets: [wallet] }
      }
      const exists = current.wallets.some((item) => item.id === wallet.id)
      if (exists) {
        return {
          wallets: current.wallets.map((item) =>
            item.id === wallet.id ? wallet : item,
          ),
        }
      }
      return { wallets: [...current.wallets, wallet] }
    },
  )
  return true
}
