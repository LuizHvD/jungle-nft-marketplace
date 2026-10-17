import { formatWei, parseDecimalToWei } from '@/domain/money.ts'

export function sameDecimal(left: string, right: string): boolean {
  return parseDecimalToWei(left) === parseDecimalToWei(right)
}

export function addDecimals(values: readonly string[]): string {
  const total = values.reduce(
    (sum, value) => sum + parseDecimalToWei(value),
    0n,
  )
  return formatWei(total)
}
