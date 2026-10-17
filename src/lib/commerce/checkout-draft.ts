import { commerceSession } from './storage.ts'

export const checkoutDraftKey = 'jungle.checkout-draft'
export const couponDraftKey = 'jungle.coupon-draft'
export const mergeFailedKey = 'jungle.merge-failed'

export type CheckoutNetwork = 'demo-mainnet' | 'demo-l2'
export type CheckoutStep = 'dados' | 'revisao'

export type CheckoutDraft = {
  userId: string
  walletId: string
  network: CheckoutNetwork
  step: CheckoutStep
}

type DraftMap = Record<string, CheckoutDraft>
type CouponMap = Record<string, string>

function readJson<T>(key: string): T | null {
  const raw = commerceSession().getItem(key)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function readCheckoutDraft(userId: string): CheckoutDraft | null {
  const draft = readJson<DraftMap>(checkoutDraftKey)?.[userId]
  if (!draft || draft.userId !== userId) {
    return null
  }
  return draft
}

export function writeCheckoutDraft(draft: CheckoutDraft): void {
  const map = readJson<DraftMap>(checkoutDraftKey) ?? {}
  map[draft.userId] = draft
  commerceSession().setItem(checkoutDraftKey, JSON.stringify(map))
}

export function readCouponDraft(actorId: string): string {
  return readJson<CouponMap>(couponDraftKey)?.[actorId] ?? ''
}

export function writeCouponDraft(actorId: string, code: string): void {
  const map = readJson<CouponMap>(couponDraftKey) ?? {}
  const trimmed = code.trim()
  if (trimmed.length === 0) {
    delete map[actorId]
  } else {
    map[actorId] = trimmed
  }
  commerceSession().setItem(couponDraftKey, JSON.stringify(map))
}

export function markMergeFailed(): void {
  commerceSession().setItem(mergeFailedKey, '1')
}

export function clearMergeFailed(): void {
  commerceSession().removeItem(mergeFailedKey)
}

export function readMergeFailed(): boolean {
  return commerceSession().getItem(mergeFailedKey) === '1'
}
