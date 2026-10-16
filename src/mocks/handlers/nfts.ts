import { http } from 'msw'
import {
  nftPageSchema,
  nftListQuerySchema,
  nftSchema,
} from '../../contracts/nfts.ts'
import { ApiError } from '../errors.ts'
import { guard } from '../failures.ts'
import { jsonData } from '../http.ts'
import { parseBody } from '../parse.ts'
import { withState } from '../store.ts'
import { parseDecimalToWei } from '../../domain/money.ts'

export const nftHandlers = [
  http.get(
    '/api/nfts',
    guard(async ({ request }) => {
      const url = new URL(request.url)
      const raw: Record<string, string> = {}
      for (const key of [
        'q',
        'sort',
        'page',
        'pageSize',
        'available',
      ] as const) {
        const value = url.searchParams.get(key)
        if (value !== null) {
          raw[key] = value
        }
      }
      const query = parseBody(nftListQuerySchema, raw)
      const page = await withState((state) => {
        const search = query.q?.trim().toLowerCase()
        let items = state.nfts.filter((nft) => {
          const matchesName = search
            ? nft.name.toLowerCase().includes(search)
            : true
          const inStock = nft.editions.some(
            (edition) => edition.availableSupply > 0,
          )
          const matchesStock =
            query.available === 'true'
              ? inStock
              : query.available === 'false'
                ? !inStock
                : true
          return matchesName && matchesStock
        })
        const priceOf = (nft: (typeof items)[number]) =>
          nft.editions.reduce(
            (lowest, edition) => {
              const price = parseDecimalToWei(edition.price)
              return price < lowest ? price : lowest
            },
            parseDecimalToWei(nft.editions[0]?.price ?? '0'),
          )
        if (query.sort === 'price-asc') {
          items = [...items].sort((left, right) =>
            priceOf(left) < priceOf(right) ? -1 : 1,
          )
        }
        if (query.sort === 'price-desc') {
          items = [...items].sort((left, right) =>
            priceOf(left) > priceOf(right) ? -1 : 1,
          )
        }
        const pageNumber = query.page ?? 1
        const pageSize = query.pageSize ?? 12
        const start = (pageNumber - 1) * pageSize
        return {
          state,
          result: nftPageSchema.parse({
            items: items.slice(start, start + pageSize),
            page: pageNumber,
            pageSize,
            total: items.length,
          }),
        }
      })
      return jsonData(nftPageSchema, page)
    }),
  ),
  http.get(
    '/api/nfts/:id',
    guard(async ({ params }) => {
      const id = String(params.id)
      const nft = await withState((state) => {
        const found = state.nfts.find((item) => item.id === id)
        if (!found) {
          throw new ApiError(404, 'NOT_FOUND', 'NFT não encontrado.')
        }
        return { state, result: nftSchema.parse(found) }
      })
      return jsonData(nftSchema, nft)
    }),
  ),
]
