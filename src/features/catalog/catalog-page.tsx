import { Link, useSearch } from '@tanstack/react-router'

import { Skeleton } from '@/components/ui/skeleton.tsx'
import { HeroShowcase } from '@/features/home/hero-showcase.tsx'
import { MintJournal } from '@/features/home/mint-journal.tsx'
import { PromoBanners } from '@/features/home/promo-banners.tsx'
import { apiErrorMessage } from '@/lib/http/error.ts'

import { CatalogControls } from './catalog-controls.tsx'
import { useCatalogChrome } from './catalog-chrome.tsx'
import { CatalogPagination } from './catalog-pagination.tsx'
import { NftCard } from './nft-card.tsx'
import { useCatalog } from './use-catalog.ts'

const skeletonCells = [0, 1, 2]

const catalogGridClass =
  'grid grid-cols-2 gap-4 min-[768px]:grid-cols-2 min-[1440px]:grid-cols-3'

export function CatalogPage() {
  const search = useSearch({ from: '/' })
  const catalog = useCatalog(search)
  const { filtersOpen } = useCatalogChrome()

  return (
    <main className="flex min-w-0 flex-col">
      <HeroShowcase />
      <section
        id="mercado"
        className={
          filtersOpen
            ? 'grid gap-4 py-6 min-[1440px]:grid-cols-[240px_minmax(0,1fr)]'
            : 'flex flex-col gap-4 py-6'
        }
      >
        <div id="catalog-filters" className={filtersOpen ? 'block' : 'hidden'}>
          <CatalogControls />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex gap-6 text-sm">
            <span className="border-b-2 border-primary pb-2 font-semibold text-brand">
              Todos os NFTs
            </span>
            <span className="pb-2 text-subtle-foreground" aria-disabled="true">
              Novos lançamentos
            </span>
            <span className="pb-2 text-subtle-foreground" aria-disabled="true">
              Em alta
            </span>
          </div>
          <h2 className="sr-only">Catálogo</h2>
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
        </div>
      </section>
      <PromoBanners />
      <MintJournal />
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
            className="aspect-square w-full"
          />
          <Skeleton className="mt-2 h-[45px] w-full" />
        </div>
      ))}
    </div>
  )
}
