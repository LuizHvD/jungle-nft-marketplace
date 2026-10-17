import { useQuery } from '@tanstack/react-query'

import { nftPageSchema } from '@/contracts/nfts.ts'
import { http } from '@/lib/http/client.ts'
import { shareNftPageData } from '@/lib/realtime/apply-realtime.ts'

import type { CatalogSearch } from './catalog-search.ts'

export function useCatalog(search: CatalogSearch) {
  return useQuery({
    queryKey: ['nfts', search] as const,
    retry: 1,
    structuralSharing: shareNftPageData,
    queryFn: async ({ signal }) => {
      const response = await http.get('/nfts', { params: search, signal })
      return nftPageSchema.parse(response.data)
    },
  })
}
