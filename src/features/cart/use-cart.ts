import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { cartSchema, type CartResponse } from '@/contracts/cart.ts'
import { http } from '@/lib/http/client.ts'
import { clearUnpostedAttempt } from '@/lib/commerce/order-attempt.ts'
import {
  cartActorId,
  cartStampCurrent,
  commitOwnedCart,
  readCartStamp,
} from '@/lib/commerce/owned.ts'
import { readStoredSession } from '@/lib/session/storage.ts'
import { readGuestId } from '@/lib/commerce/guest-id.ts'

export function commerceActorId(userId: string | null | undefined): string {
  if (userId) {
    return userId
  }
  return `guest:${readGuestId()}`
}

export function useCart(actorId: string) {
  return useQuery({
    queryKey: ['cart', actorId],
    queryFn: async ({ signal }) => {
      const stamp = readCartStamp()
      const response = await http.get('/cart', { signal })
      const cart = cartSchema.parse(response.data)
      if (!stamp || !cartStampCurrent(stamp) || cart.actorId !== actorId) {
        throw new Error('Carrinho de outro ator.')
      }
      return cart
    },
  })
}

function useCartMutation<TInput>(
  request: (input: TInput) => Promise<CartResponse>,
) {
  const client = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: TInput) => {
      const stamp = readCartStamp()
      if (!stamp) {
        throw new Error('Ator ausente.')
      }
      const cart = await request(input)
      return { cart, stamp }
    },
    onSuccess: ({ cart, stamp }) => {
      if (!commitOwnedCart(client, stamp, cart)) {
        return
      }
      const session = readStoredSession()
      if (session && stamp.kind === 'user') {
        clearUnpostedAttempt(session.user.id)
      }
      void client.invalidateQueries({
        queryKey: ['quote', cartActorId(stamp)],
      })
    },
  })
}

export function useAddCartItem() {
  return useCartMutation(
    async (input: { nftId: string; editionId: string; quantity: number }) => {
      const response = await http.post('/cart/items', input)
      return cartSchema.parse(response.data)
    },
  )
}

export function useUpdateCartItem() {
  return useCartMutation(async (input: { id: string; quantity: number }) => {
    const response = await http.patch(`/cart/items/${input.id}`, {
      quantity: input.quantity,
    })
    return cartSchema.parse(response.data)
  })
}

export function useRemoveCartItem() {
  return useCartMutation(async (id: string) => {
    const response = await http.delete(`/cart/items/${id}`)
    return cartSchema.parse(response.data)
  })
}
