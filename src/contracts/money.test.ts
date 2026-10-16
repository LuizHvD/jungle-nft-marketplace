import { describe, expect, it } from 'vitest'
import { decimalStringSchema } from './money.ts'

describe('schema de ETH', () => {
  it('rejeita número JSON', () => {
    expect(decimalStringSchema.safeParse(1.5).success).toBe(false)
    expect(decimalStringSchema.safeParse('1e2').success).toBe(false)
    expect(decimalStringSchema.safeParse('1.1234567890123456789').success).toBe(
      false,
    )
    expect(decimalStringSchema.safeParse('1.500000000000000000').success).toBe(
      true,
    )
  })
})
