import { useRouterState } from '@tanstack/react-router'
import { createContext, useContext, useState, type ReactNode } from 'react'

type CatalogChromeValue = {
  filtersOpen: boolean
  toggleFilters: () => void
  draftQuery: string
  setDraftQuery: (value: string) => void
}

const CatalogChromeContext = createContext<CatalogChromeValue | null>(null)

export function CatalogChromeProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftQuery, setDraftQuery] = useState('')
  const [trackedPath, setTrackedPath] = useState(pathname)

  if (pathname !== trackedPath) {
    setTrackedPath(pathname)
    if (pathname !== '/') {
      setDraftQuery('')
    }
  }

  return (
    <CatalogChromeContext.Provider
      value={{
        filtersOpen,
        toggleFilters: () => {
          setFiltersOpen((open) => !open)
        },
        draftQuery,
        setDraftQuery,
      }}
    >
      {children}
    </CatalogChromeContext.Provider>
  )
}

export function useCatalogChrome(): CatalogChromeValue {
  const value = useContext(CatalogChromeContext)
  if (value) {
    return value
  }
  throw new Error('Catálogo sem o chrome do shell.')
}
