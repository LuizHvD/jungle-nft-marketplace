import { nftListQuerySchema } from '@/contracts/nfts.ts'

export type CatalogSearch = {
  q?: string
  sort?: 'relevance' | 'price-asc' | 'price-desc'
  page?: number
  pageSize?: number
  available?: 'true' | 'false'
}

function hasKey(search: Record<string, unknown>, key: string): boolean {
  return Object.hasOwn(search, key)
}

export function parseCatalogSearch(
  search: Record<string, unknown>,
): CatalogSearch {
  const parsed: CatalogSearch = {}

  if (
    hasKey(search, 'q') &&
    typeof search.q === 'string' &&
    search.q.length > 0
  ) {
    const result = nftListQuerySchema.shape.q.safeParse(search.q)
    if (result.success && result.data) {
      parsed.q = result.data
    }
  }

  if (hasKey(search, 'sort')) {
    const result = nftListQuerySchema.shape.sort.safeParse(search.sort)
    if (result.success && result.data) {
      parsed.sort = result.data
    }
  }

  if (hasKey(search, 'available')) {
    const available =
      search.available === true
        ? 'true'
        : search.available === false
          ? 'false'
          : search.available
    const result = nftListQuerySchema.shape.available.safeParse(available)
    if (result.success && result.data) {
      parsed.available = result.data
    }
  }

  if (hasKey(search, 'page')) {
    const result = nftListQuerySchema.shape.page.safeParse(search.page)
    if (result.success && result.data) {
      parsed.page = result.data
    }
  }

  if (hasKey(search, 'pageSize')) {
    const result = nftListQuerySchema.shape.pageSize.safeParse(search.pageSize)
    if (result.success && result.data) {
      parsed.pageSize = result.data
    }
  }

  return parsed
}
