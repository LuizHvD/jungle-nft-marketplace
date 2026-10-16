const WEI_SCALE = 10n ** 18n
const DECIMAL_PATTERN = /^\d{1,12}(\.\d{1,18})?$/

export function parseDecimalToWei(value: string): bigint {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new Error('Valor ETH inválido.')
  }

  const [whole, fraction = ''] = value.split('.')
  const padded = fraction.padEnd(18, '0')
  return BigInt(whole) * WEI_SCALE + BigInt(padded)
}

export function formatWei(wei: bigint): string {
  const negative = wei < 0n
  const absolute = negative ? -wei : wei
  const whole = absolute / WEI_SCALE
  const fraction = (absolute % WEI_SCALE).toString().padStart(18, '0')
  const sign = negative ? '-' : ''
  return `${sign}${whole.toString()}.${fraction}`
}

export function multiplyQuantity(unitWei: bigint, quantity: number): bigint {
  return unitWei * BigInt(quantity)
}

export function applyBasisPoints(
  amountWei: bigint,
  basisPoints: number,
): bigint {
  return (amountWei * BigInt(basisPoints)) / 10000n
}
