import { useQuery } from '@tanstack/react-query'

import { nftSchema } from '@/contracts/nfts.ts'
import { http } from '@/lib/http/client.ts'

export function nftQueryOptions(nftId: string) {
  return {
    queryKey: ['nfts', 'detail', nftId] as const,
    retry: 1,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const response = await http.get(`/nfts/${encodeURIComponent(nftId)}`, {
        signal,
      })
      return nftSchema.parse(response.data)
    },
  }
}

export function useNft(nftId: string) {
  return useQuery(nftQueryOptions(nftId))
}
