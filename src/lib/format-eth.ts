const ethFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatEth(value: string): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return value
  }
  return `${ethFormatter.format(amount)} ETH`
}
