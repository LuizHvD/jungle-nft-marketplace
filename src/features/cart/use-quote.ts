import { useQuery } from '@tanstack/react-query'
import type { z } from 'zod'

import { quoteRequestSchema, quoteSchema } from '@/contracts/quotes.ts'
import { http } from '@/lib/http/client.ts'
import { cartStampCurrent, readCartStamp } from '@/lib/commerce/owned.ts'
import {
  quoteSignature,
  type QuoteLine,
} from '@/lib/commerce/quote-signature.ts'

type QuoteBody = z.infer<typeof quoteRequestSchema>

export function useQuote(
  actorId: string,
  input: {
    items: readonly QuoteLine[]
    couponCode?: string
    walletId?: string
    network?: 'demo-mainnet' | 'demo-l2'
    connection?: string
  } | null,
) {
  const signature = input ? quoteSignature(input) : 'empty'
  return useQuery({
    queryKey: ['quote', actorId, signature],
    enabled: Boolean(input && input.items.length > 0),
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
    queryFn: async ({ signal }) => {
      if (!input) {
        throw new Error('Cotação vazia.')
      }
      const stamp = readCartStamp()
      const body: QuoteBody = {
        items: input.items.map((item) => ({ ...item })),
      }
      if (input.couponCode) {
        body.couponCode = input.couponCode
      }
      if (input.walletId && input.network) {
        body.walletId = input.walletId
        body.network = input.network
      }
      const response = await http.post('/quotes', body, { signal })
      const quote = quoteSchema.parse(response.data)
      if (!stamp || !cartStampCurrent(stamp)) {
        throw new Error('Cotação de outro ator.')
      }
      return quote
    },
  })
}
