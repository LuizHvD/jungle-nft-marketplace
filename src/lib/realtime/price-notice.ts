import { useSyncExternalStore } from 'react'

export const priceNoticeText = 'O preço mudou.'

let notice = ''
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function readPriceNotice(): string {
  return notice
}

export function publishPriceNotice(): void {
  notice = priceNoticeText
  emit()
}

export function clearPriceNotice(): void {
  if (notice === '') {
    return
  }
  notice = ''
  emit()
}

export function subscribePriceNotice(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usePriceNotice(): string {
  return useSyncExternalStore(subscribePriceNotice, readPriceNotice, () => '')
}
