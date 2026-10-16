import { Link, useSearch } from '@tanstack/react-router'

import { Skeleton } from '@/components/ui/skeleton.tsx'
import { apiErrorMessage } from '@/lib/http/error.ts'

import { CatalogPagination } from './catalog-pagination.tsx'
import { NftCard } from './nft-card.tsx'
import { useCatalog } from './use-catalog.ts'

const skeletonCells = [0, 1, 2]

// Provisório: o Product Grid não teve colunas medidas. 1, 2 e 3.
const catalogGridClass =
  'grid grid-cols-1 gap-[16px] min-[768px]:grid-cols-2 min-[1440px]:grid-cols-3'

export function CatalogPage() {
  const search = useSearch({ from: '/' })
  const catalog = useCatalog(search)

  return (
    <main className="flex min-w-0 flex-col gap-[16px]">
      <h1>Catálogo</h1>
      {catalog.isPending ? <CatalogSkeleton /> : null}
      {catalog.isError ? (
        <div>
          <p>
            {apiErrorMessage(
              catalog.error,
              'Não foi possível carregar o catálogo.',
            )}
          </p>
          <button type="button" onClick={() => void catalog.refetch()}>
            Tentar de novo
          </button>
        </div>
      ) : null}
      {catalog.data && catalog.data.total === 0 ? (
        <p>Nenhum NFT encontrado.</p>
      ) : null}
      {catalog.data &&
      catalog.data.items.length === 0 &&
      catalog.data.total > 0 ? (
        <div>
          <p>Esta página não tem itens.</p>
          <Link
            to="/"
            search={(current) => {
              const next = { ...current }
              delete next.page
              return next
            }}
          >
            Página 1
          </Link>
        </div>
      ) : null}
      {catalog.data && catalog.data.items.length > 0 ? (
        <>
          <section
            data-testid="catalog-grid"
            aria-label="Product Grid"
            className={catalogGridClass}
          >
            {catalog.data.items.map((nft, index) => (
              <NftCard
                key={nft.id}
                nft={nft}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            ))}
          </section>
          <CatalogPagination
            page={catalog.data.page}
            pageSize={catalog.data.pageSize}
            total={catalog.data.total}
          />
        </>
      ) : null}
    </main>
  )
}

function CatalogSkeleton() {
  return (
    <div
      aria-busy="true"
      data-testid="catalog-grid"
      className={catalogGridClass}
    >
      {skeletonCells.map((cell) => (
        <div key={cell}>
          <Skeleton
            data-testid="catalog-skeleton"
            className="aspect-[960/960] w-full"
          />
          <Skeleton className="mt-[8px] h-[45px] w-full" />
        </div>
      ))}
    </div>
  )
}
