import { commerceLocal } from './storage.ts'

export const guestIdKey = 'jungle.guest-id'

export function peekGuestId(): string | null {
  const current = commerceLocal().getItem(guestIdKey)?.trim()
  if (!current) {
    return null
  }
  return current
}

export function readGuestId(): string {
  const current = peekGuestId()
  if (current) {
    return current
  }
  const created = crypto.randomUUID()
  commerceLocal().setItem(guestIdKey, created)
  return created
}

export function rotateGuestId(): string {
  const created = crypto.randomUUID()
  commerceLocal().setItem(guestIdKey, created)
  return created
}
