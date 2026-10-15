import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button.tsx'

const medallions = ['1', '2', '3'] as const
const linkColumns = ['1', '2', '3', '4'] as const

function keepNewsletterVisible(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
}

export function SiteFooter() {
  return (
    <footer
      data-testid="site-footer"
      data-fallback="provisional"
      className="hidden w-full min-[1440px]:flex min-[1440px]:flex-col min-[1440px]:gap-[24px]"
    >
      <div className="flex items-center justify-between">
        <ul aria-label="Medalhões" className="flex gap-[24px]">
          {medallions.map((item) => (
            <li key={item}>
              <span
                role="img"
                aria-label={`Medalhão ${item}`}
                className="inline-flex size-[45px] items-center justify-center rounded-full bg-primary text-ink"
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
        <form
          aria-label="Newsletter"
          className="flex items-center gap-[8px]"
          onSubmit={keepNewsletterVisible}
        >
          <label htmlFor="newsletter-email">Newsletter</label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            className="h-[45px] w-[313px] max-w-full rounded-[10px] bg-surface-card px-[12px]"
          />
          <Button type="submit">Enviar</Button>
        </form>
      </div>
      <div className="flex items-center justify-between">
        <p className="m-0">KURIO</p>
        <div className="flex gap-[24px]">
          <Button>Social</Button>
          <Button>Carteira</Button>
        </div>
      </div>
      <ul aria-label="Colunas de links" className="grid grid-cols-4 gap-[24px]">
        {linkColumns.map((column) => (
          <li key={column}>
            <Button>Link {column}</Button>
          </li>
        ))}
      </ul>
    </footer>
  )
}
