import { formatWei, parseDecimalToWei } from './money.ts'

export function canonicalIdempotencyPayload(
  quoteId: string,
  expectedTotal: string,
): string {
  const normalized = formatWei(parseDecimalToWei(expectedTotal))
  return JSON.stringify({ expectedTotal: normalized, quoteId })
}

export async function hashIdempotencyPayload(
  quoteId: string,
  expectedTotal: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(
    canonicalIdempotencyPayload(quoteId, expectedTotal),
  )
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
