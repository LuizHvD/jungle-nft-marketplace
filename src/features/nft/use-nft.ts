import { useQuery } from '@tanstack/react-query'

import { nftSchema } from '@/contracts/nfts.ts'
import { http } from '@/lib/http/client.ts'

export function useNft(nftId: string) {
  return useQuery({
    queryKey: ['nfts', 'detail', nftId] as const,
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await http.get(`/nfts/${encodeURIComponent(nftId)}`, {
        signal,
      })
      return nftSchema.parse(response.data)
    },
  })
}
