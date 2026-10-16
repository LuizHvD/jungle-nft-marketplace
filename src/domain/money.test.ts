import { describe, expect, it } from 'vitest'
import {
  applyBasisPoints,
  formatWei,
  multiplyQuantity,
  parseDecimalToWei,
} from './money.ts'

describe('dinheiro em wei', () => {
  it('converte string decimal sem float', () => {
    expect(parseDecimalToWei('1.500000000000000000')).toBe(1500000000000000000n)
    expect(parseDecimalToWei('1.5')).toBe(1500000000000000000n)
    expect(formatWei(1500000000000000000n)).toBe('1.500000000000000000')
  })

  it('soma quantidade inteira e trunca o desconto', () => {
    const unit = parseDecimalToWei('1.500000000000000000')
    const subtotal = multiplyQuantity(unit, 2)
    expect(subtotal).toBe(3000000000000000000n)
    expect(applyBasisPoints(subtotal, 1000)).toBe(300000000000000000n)
    expect(applyBasisPoints(1n, 1)).toBe(0n)
  })

  it('rejeita número, notação científica e casa extra', () => {
    expect(() => parseDecimalToWei('1e2')).toThrow()
    expect(() => parseDecimalToWei('1.1234567890123456789')).toThrow()
    expect(() => parseDecimalToWei('-1.0')).toThrow()
  })
})
