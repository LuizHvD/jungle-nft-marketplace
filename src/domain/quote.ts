import { applyBasisPoints } from './money.ts'

export type QuoteTotals = {
  subtotalWei: bigint
  discountWei: bigint
  feeWei: bigint
  totalWei: bigint
}

export function quoteTotals(input: {
  lines: readonly { unitPriceWei: bigint; quantity: number }[]
  couponBasisPoints: number
  feeWei: bigint
}): QuoteTotals {
  const subtotalWei = input.lines.reduce(
    (sum, line) => sum + line.unitPriceWei * BigInt(line.quantity),
    0n,
  )
  const rawDiscount = applyBasisPoints(subtotalWei, input.couponBasisPoints)
  const discountWei = rawDiscount > subtotalWei ? subtotalWei : rawDiscount
  const feeWei = input.feeWei
  return {
    subtotalWei,
    discountWei,
    feeWei,
    totalWei: subtotalWei - discountWei + feeWei,
  }
}
