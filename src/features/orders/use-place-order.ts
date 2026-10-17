import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { orderSchema } from '@/contracts/orders.ts'
import { http } from '@/lib/http/client.ts'
import { apiErrorCode, isAbortError } from '@/lib/http/error.ts'
import { appendOrderId } from '@/lib/commerce/order-index.ts'
import {
  beginOrderPost,
  endOrderPost,
  markOrderAttemptPosted,
  readOrderAttempt,
  releaseUnconsumedAttempt,
  rememberOrderAttempt,
} from '@/lib/commerce/order-attempt.ts'
import { readActorStamp } from '@/lib/session/owned-cache.ts'

const orderTimeoutMs = 4000

const unconsumedCodes = new Set([
  'QUOTE_STALE',
  'SOLD_OUT',
  'QUANTITY_LIMIT',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'VALIDATION',
  'TRANSIENT',
  'NOT_FOUND',
])

export type PlaceOrderInput = {
  userId: string
  quoteId: string
  expectedTotal: string
  key: string
}

export function usePlaceOrder() {
  const client = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    retry: false,
    mutationFn: async (input: PlaceOrderInput) => {
      if (!beginOrderPost()) {
        throw new Error('Pedido já em andamento.')
      }
      try {
        const stamp = readActorStamp()
        if (!stamp || stamp.userId !== input.userId) {
          throw new Error('Sessão ausente.')
        }
        markOrderAttemptPosted(input.userId)
        const response = await http.post(
          '/orders',
          { quoteId: input.quoteId, expectedTotal: input.expectedTotal },
          {
            headers: { 'Idempotency-Key': input.key },
            signal: AbortSignal.timeout(orderTimeoutMs),
          },
        )
        const order = orderSchema.parse(response.data)
        return { order, userId: input.userId, stamp }
      } catch (error) {
        if (!isAbortError(error)) {
          const code = apiErrorCode(error)
          if (code && unconsumedCodes.has(code)) {
            releaseUnconsumedAttempt(input.userId)
          }
        }
        throw error
      } finally {
        endOrderPost()
      }
    },
    onSuccess: ({ order, userId, stamp }) => {
      if (stamp.userId !== userId || readActorStamp()?.token !== stamp.token) {
        return
      }
      rememberOrderAttempt(userId, order.id)
      appendOrderId(userId, order.id)
      void client.invalidateQueries({ queryKey: ['cart', userId] })
      void navigate({
        to: '/pedidos/$orderId',
        params: { orderId: order.id },
      })
    },
  })
}

export function storedPlaceInput(userId: string): PlaceOrderInput | null {
  const attempt = readOrderAttempt(userId)
  if (!attempt) {
    return null
  }
  return {
    userId,
    quoteId: attempt.quoteId,
    expectedTotal: attempt.expectedTotal,
    key: attempt.key,
  }
}
