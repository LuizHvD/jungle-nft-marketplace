import type { CheckoutStep } from './checkout-draft.ts'

export function confirmAllowed(input: {
  step: CheckoutStep
  definitive: boolean
  connected: boolean
  fetching: boolean
  quoteId: string | null
  rejectedQuoteId: string | null
  pendingAttempt: boolean
}): boolean {
  if (input.step !== 'revisao') {
    return false
  }
  if (!input.definitive || !input.connected || input.fetching || input.pendingAttempt) {
    return false
  }
  if (!input.quoteId) {
    return false
  }
  if (input.rejectedQuoteId && input.quoteId === input.rejectedQuoteId) {
    return false
  }
  return true
}
