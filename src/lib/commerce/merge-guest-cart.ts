import { http } from '@/lib/http/client.ts'

import { peekGuestId, rotateGuestId } from './guest-id.ts'

export type MergeResult = 'merged' | 'skipped' | 'failed'

export async function mergeGuestCart(
  token: string,
  post: (guestId: string, token: string) => Promise<void> = postGuestMerge,
): Promise<MergeResult> {
  const guestId = peekGuestId()
  if (!guestId) {
    return 'skipped'
  }
  try {
    await post(guestId, token)
  } catch {
    return 'failed'
  }
  rotateGuestId()
  return 'merged'
}

async function postGuestMerge(guestId: string, token: string): Promise<void> {
  await http.post(
    '/cart/merge',
    { guestId },
    { headers: { Authorization: `Bearer ${token}` } },
  )
}
