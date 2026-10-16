import { describe, expect, it } from 'vitest'
import {
  canonicalIdempotencyPayload,
  hashIdempotencyPayload,
} from './idempotency.ts'

describe('hash de idempotência', () => {
  it('normaliza casas decimais antes do hash', async () => {
    const compact = await hashIdempotencyPayload('quote-1', '1.5')
    const padded = await hashIdempotencyPayload(
      'quote-1',
      '1.500000000000000000',
    )
    expect(compact).toBe(padded)
    expect(canonicalIdempotencyPayload('quote-1', '1.5')).toBe(
      '{"expectedTotal":"1.500000000000000000","quoteId":"quote-1"}',
    )
  })

  it('muda o hash quando o total muda', async () => {
    const first = await hashIdempotencyPayload('quote-1', '1.5')
    const second = await hashIdempotencyPayload('quote-1', '1.6')
    expect(first).not.toBe(second)
  })
})
