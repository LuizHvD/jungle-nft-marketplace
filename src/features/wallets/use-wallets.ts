import { useQuery, type QueryClient } from '@tanstack/react-query'

import { walletListSchema, type Wallet } from '@/contracts/wallets.ts'
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

export function saveWallet(
  client: QueryClient,
  userId: string,
  wallet: Wallet,
): void {
  client.setQueryData<{ wallets: Wallet[] }>(['wallets', userId], (current) => {
    if (!current) {
      return { wallets: [wallet] }
    }
    const exists = current.wallets.some((item) => item.id === wallet.id)
    if (exists) {
      return {
        wallets: current.wallets.map((item) =>
          item.id === wallet.id ? wallet : item,
        ),
      }
    }
    return { wallets: [...current.wallets, wallet] }
  })
}
