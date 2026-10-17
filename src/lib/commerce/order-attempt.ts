import { commerceLocal } from './storage.ts'

export const orderAttemptKey = 'jungle.order-attempt'

export type OrderAttempt = {
  userId: string
  key: string
  quoteId: string
  expectedTotal: string
  posted: boolean
  orderId?: string
}

type AttemptMap = Record<string, OrderAttempt>

export type PreparedAttempt =
  | { blocked: false; attempt: OrderAttempt }
  | { blocked: true; attempt: OrderAttempt }

let orderPostLock = false

function readMap(): AttemptMap {
  const raw = commerceLocal().getItem(orderAttemptKey)
  if (!raw) {
    return {}
  }
  try {
    const parsed = JSON.parse(raw) as AttemptMap
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }
    return parsed
  } catch {
    return {}
  }
}

function writeMap(map: AttemptMap): void {
  commerceLocal().setItem(orderAttemptKey, JSON.stringify(map))
}

export function readOrderAttempt(userId: string): OrderAttempt | null {
  const attempt = readMap()[userId]
  if (!attempt || attempt.userId !== userId) {
    return null
  }
  return attempt
}

export function prepareOrderAttempt(input: {
  userId: string
  quoteId: string
  expectedTotal: string
}): PreparedAttempt {
  const existing = readOrderAttempt(input.userId)
  if (
    existing &&
    existing.quoteId === input.quoteId &&
    existing.expectedTotal === input.expectedTotal
  ) {
    return { blocked: false, attempt: existing }
  }
  if (existing?.posted && !existing.orderId) {
    return { blocked: true, attempt: existing }
  }
  const attempt: OrderAttempt = {
    userId: input.userId,
    key: crypto.randomUUID(),
    quoteId: input.quoteId,
    expectedTotal: input.expectedTotal,
    posted: false,
  }
  const map = readMap()
  map[input.userId] = attempt
  writeMap(map)
  return { blocked: false, attempt }
}

export function markOrderAttemptPosted(userId: string): void {
  const map = readMap()
  const current = map[userId]
  if (!current) {
    return
  }
  map[userId] = { ...current, posted: true }
  writeMap(map)
}

export function rememberOrderAttempt(userId: string, orderId: string): void {
  const map = readMap()
  const current = map[userId]
  if (!current) {
    return
  }
  map[userId] = { ...current, posted: true, orderId }
  writeMap(map)
}

export function releaseUnconsumedAttempt(userId: string): void {
  const current = readOrderAttempt(userId)
  if (!current || current.orderId) {
    return
  }
  const map = readMap()
  delete map[userId]
  writeMap(map)
}

export function clearUnpostedAttempt(userId: string): void {
  const current = readOrderAttempt(userId)
  if (!current || current.posted) {
    return
  }
  const map = readMap()
  delete map[userId]
  writeMap(map)
}

export function beginOrderPost(): boolean {
  if (orderPostLock) {
    return false
  }
  orderPostLock = true
  return true
}

export function endOrderPost(): void {
  orderPostLock = false
}
