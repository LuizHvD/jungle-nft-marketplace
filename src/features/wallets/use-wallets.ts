import { useQuery } from '@tanstack/react-query'

import { walletListSchema } from '@/contracts/wallets.ts'
import { http } from '@/lib/http/client.ts'

export function useWallets(userId: string | undefined) {
  return useQuery({
    queryKey: ['wallets', userId],
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const response = await http.get('/wallets', { signal })
      return walletListSchema.parse(response.data)
    },
  })
}
