import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router'

import { parseCatalogSearch, type CatalogSearch } from './catalog-search.ts'
import { useCatalogChrome } from './catalog-chrome.tsx'

function draftQuery(value: string): string | undefined {
  const trimmed = value.trim()
  if (trimmed.length > 0) {
    return trimmed
  }
  return undefined
}

export function CatalogControls() {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const onCatalog = pathname === '/'
  const current = useSearch({ strict: false })
  const { draftQuery: draft } = useCatalogChrome()
  const search = onCatalog
    ? parseCatalogSearch(current as Record<string, unknown>)
    : {}

  function go(next: CatalogSearch) {
    if (onCatalog) {
      void navigate({ to: '/', search: next })
      return
    }
    const q = draftQuery(draft)
    void navigate({
      to: '/',
      search: {
        ...(q ? { q } : {}),
        ...(next.available ? { available: next.available } : {}),
        ...(next.sort ? { sort: next.sort } : {}),
      },
    })
  }

  return (
    <div id="catalog-filters" className="flex flex-col gap-[16px]">
      <label className="flex flex-col gap-[8px]">
        Disponibilidade
        <select
          value={search.available ?? ''}
          onChange={(event) => {
            const available = event.target.value
            const next: CatalogSearch = { ...search, page: undefined }
            if (available === 'true' || available === 'false') {
              next.available = available
            } else {
              delete next.available
            }
            delete next.page
            go(next)
          }}
        >
          <option value="">Todos</option>
          <option value="true">Disponíveis</option>
          <option value="false">Esgotados</option>
        </select>
      </label>
      <label className="flex flex-col gap-[8px]">
        Ordenação
        <select
          value={search.sort ?? ''}
          onChange={(event) => {
            const sort = event.target.value
            const next: CatalogSearch = { ...search }
            if (
              sort === 'relevance' ||
              sort === 'price-asc' ||
              sort === 'price-desc'
            ) {
              next.sort = sort
            } else {
              delete next.sort
            }
            if (next.sort === 'relevance') {
              delete next.sort
            }
            delete next.page
            go(next)
          }}
        >
          <option value="">Relevância</option>
          <option value="price-asc">Menor preço</option>
          <option value="price-desc">Maior preço</option>
        </select>
      </label>
    </div>
  )
}
