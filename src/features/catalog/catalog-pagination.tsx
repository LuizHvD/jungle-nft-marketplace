import { Link } from '@tanstack/react-router'

type CatalogPaginationProps = {
  page: number
  pageSize: number
  total: number
}

export function CatalogPagination({
  page,
  pageSize,
  total,
}: CatalogPaginationProps) {
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount <= 1) {
    return null
  }

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)

  return (
    <nav aria-label="Paginação" className="flex gap-2">
      {pages.map((pageNumber) => (
        <Link
          key={pageNumber}
          to="/"
          search={(current) => {
            const next = { ...current }
            if (pageNumber === 1) {
              delete next.page
              return next
            }
            return { ...next, page: pageNumber }
          }}
          aria-current={pageNumber === page ? 'page' : undefined}
          className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-ink aria-[current=page]:outline aria-[current=page]:outline-2 aria-[current=page]:outline-offset-2"
        >
          {pageNumber}
        </Link>
      ))}
    </nav>
  )
}
