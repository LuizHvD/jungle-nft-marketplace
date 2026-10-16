export type EditionLine = {
  nftId: string
  editionId: string
  quantity: number
}

export function aggregateEditionLines<T extends EditionLine>(
  lines: readonly T[],
): T[] {
  const grouped = new Map<string, T>()

  for (const line of lines) {
    const key = `${line.nftId}:${line.editionId}`
    const current = grouped.get(key)
    if (current) {
      current.quantity += line.quantity
    } else {
      grouped.set(key, { ...line })
    }
  }

  return [...grouped.values()]
}
