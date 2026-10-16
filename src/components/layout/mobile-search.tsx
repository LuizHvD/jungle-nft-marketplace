import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button.tsx'
import { ProvisionalIcon } from '@/components/layout/provisional-icon.tsx'
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
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1440px)')
    const apply = () => {
      setDesktop(media.matches)
    }
    apply()
    media.addEventListener('change', apply)
    return () => {
      media.removeEventListener('change', apply)
    }
  }, [])

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
      void navigate({ to: '/', search: { q } })
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-[366px] items-center gap-[8px]"
    >
      <input
        id="catalog-search"
        type="search"
        aria-label="Busca"
        value={value}
        onChange={(event) => changeQuery(event.target.value)}
        className="h-[45px] min-w-0 flex-1 rounded-[10px] border-0 bg-surface-card pt-[12px] pr-[129px] pb-[12px] pl-[12px] text-inherit"
      />
      <Button
        variant="primary"
        aria-label="Iconly/Curved/Filter"
        aria-expanded={filtersOpen || (onCatalog && desktop)}
        aria-controls="catalog-filters"
        className="size-[45px] shrink-0 rounded-[14px] p-[12px]"
        onClick={toggleFilters}
      >
        <ProvisionalIcon name="filter" className="size-full" />
      </Button>
    </form>
  )
}
