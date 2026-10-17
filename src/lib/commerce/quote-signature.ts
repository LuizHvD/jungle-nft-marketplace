export type QuoteLine = {
  nftId: string
  editionId: string
  quantity: number
}

export function quoteSignature(input: {
  items: readonly QuoteLine[]
  couponCode?: string
  walletId?: string
  network?: string
  connection?: string
}): string {
  const items = [...input.items].sort((left, right) =>
    `${left.nftId}:${left.editionId}`.localeCompare(
      `${right.nftId}:${right.editionId}`,
    ),
  )
  return JSON.stringify({
    items,
    couponCode: input.couponCode ?? null,
    walletId: input.walletId ?? null,
    network: input.network ?? null,
    connection: input.connection ?? null,
  })
}
