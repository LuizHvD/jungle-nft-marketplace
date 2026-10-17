import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router'
import { SlidersHorizontal } from 'lucide-react'
import type { FormEvent } from 'react'

import { useCatalogChrome } from '@/features/catalog/catalog-chrome.tsx'

function queryText(value: string): string | undefined {
  const trimmed = value.trim()
  if (trimmed.length > 0) {
    return trimmed
  }
  return undefined
}

export function MobileSearch() {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const onCatalog = pathname === '/'
  const current = useSearch({ strict: false })
  const { filtersOpen, toggleFilters, draftQuery, setDraftQuery } =
    useCatalogChrome()
  const urlQuery =
    onCatalog && 'q' in current && typeof current.q === 'string'
      ? current.q
      : ''
  const value = onCatalog ? urlQuery : draftQuery

  function changeQuery(next: string) {
    if (onCatalog) {
      void navigate({
        to: '/',
        replace: true,
        search: (previous) => {
          const search = { ...previous }
          if (next.length > 0) {
            search.q = next
          } else {
            delete search.q
          }
          delete search.page
          return search
        },
      })
      return
    }
    setDraftQuery(next)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (onCatalog) {
      return
    }
    const q = queryText(value)
    if (q) {
      void navigate({ to: '/', search: { q }, hash: 'mercado' })
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full items-center gap-2">
      <label className="sr-only" htmlFor="catalog-search">
        Busca
      </label>
      <input
        id="catalog-search"
        type="search"
        role="searchbox"
        aria-label="Busca"
        placeholder="Explorar coleções"
        value={value}
        onChange={(event) => changeQuery(event.target.value)}
        className="h-[45px] min-w-0 flex-1 rounded-[10px] border-0 bg-surface px-3 text-inherit placeholder:text-subtle-foreground"
      />
      <button
        type="button"
        aria-label="Filtros"
        aria-expanded={filtersOpen}
        aria-controls="catalog-filters"
        className="flex size-[45px] shrink-0 items-center justify-center rounded-[14px] bg-primary bg-[linear-gradient(135deg,#885933,#c98449)] text-ink"
        onClick={toggleFilters}
      >
        <SlidersHorizontal className="size-5" aria-hidden="true" />
      </button>
    </form>
  )
}
