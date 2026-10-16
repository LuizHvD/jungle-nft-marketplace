import { useQuery } from '@tanstack/react-query'

import { profileSchema } from '@/contracts/profile.ts'
import { http } from '@/lib/http/client.ts'

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const response = await http.get('/profile', { signal })
      return profileSchema.parse(response.data)
    },
  })
}
