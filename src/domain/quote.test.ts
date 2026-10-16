import { describe, expect, it } from 'vitest'
import { formatWei, parseDecimalToWei } from './money.ts'
import { quoteTotals } from './quote.ts'

describe('cotação', () => {
  it('aplica desconto em wei e soma a taxa', () => {
    const totals = quoteTotals({
      lines: [
        {
          unitPriceWei: parseDecimalToWei('1.500000000000000000'),
          quantity: 2,
        },
      ],
      couponBasisPoints: 1000,
      feeWei: parseDecimalToWei('0.002000000000000000'),
    })

    expect(formatWei(totals.subtotalWei)).toBe('3.000000000000000000')
    expect(formatWei(totals.discountWei)).toBe('0.300000000000000000')
    expect(formatWei(totals.feeWei)).toBe('0.002000000000000000')
    expect(formatWei(totals.totalWei)).toBe('2.702000000000000000')
  })
})
