export type CartLine = {
  nftId: string
  editionId: string
  quantity: number
}

export function mergeCartLines(
  current: readonly CartLine[],
  incoming: readonly CartLine[],
  availableSupply: (nftId: string, editionId: string) => number,
): CartLine[] {
  const merged = current.map((line) => ({ ...line }))

  for (const line of incoming) {
    const supply = availableSupply(line.nftId, line.editionId)
    const existing = merged.find(
      (item) => item.nftId === line.nftId && item.editionId === line.editionId,
    )
    const combined = (existing?.quantity ?? 0) + line.quantity
    const quantity = combined > supply ? supply : combined

    if (existing) {
      existing.quantity = quantity
    } else {
      merged.push({
        nftId: line.nftId,
        editionId: line.editionId,
        quantity,
      })
    }
  }

  return merged.filter((line) => line.quantity > 0)
}
