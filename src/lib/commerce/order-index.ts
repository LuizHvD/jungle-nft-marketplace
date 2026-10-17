import { commerceLocal } from './storage.ts'

export const orderIndexKey = 'jungle.order-index'

type OrderIndex = Record<string, string[]>

function readIndex(): OrderIndex {
  const raw = commerceLocal().getItem(orderIndexKey)
  if (!raw) {
    return {}
  }
  try {
    const parsed = JSON.parse(raw) as OrderIndex
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }
    return parsed
  } catch {
    return {}
  }
}

export function readOrderIndex(userId: string): string[] {
  const ids = readIndex()[userId]
  if (!ids) {
    return []
  }
  return ids.filter((id) => typeof id === 'string' && id.length > 0)
}

export function appendOrderId(userId: string, orderId: string): void {
  const index = readIndex()
  const current = index[userId] ?? []
  if (current.includes(orderId)) {
    return
  }
  index[userId] = [...current, orderId]
  commerceLocal().setItem(orderIndexKey, JSON.stringify(index))
}
