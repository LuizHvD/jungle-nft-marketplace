import { ArrowRight } from 'lucide-react'

import { ArtPicture } from '@/components/ui/art-picture.tsx'
import type { ArtSlug } from '@/features/catalog/nft-images.ts'

const banners: {
  title: string
  description: string
  slug: ArtSlug
  href: string
}[] = [
  {
    title: 'Edições ainda disponíveis',
    description: 'Veja o que ainda tem estoque no catálogo Kurio.',
    slug: 'emerald',
    href: '/?available=true#mercado',
  },
  {
    title: 'Retratos da coleção',
    description: 'As obras publicadas nesta vitrine, com preço ao vivo.',
    slug: 'ivory',
    href: '/#mercado',
  },
]

export function PromoBanners() {
  return (
    <section aria-label="Destaques do mercado" className="py-12">
      <ul className="grid gap-6 lg:grid-cols-2">
        {banners.map((banner) => (
          <li
            key={banner.title}
            className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] overflow-hidden rounded-xl bg-surface sm:h-[250px]"
          >
            <ArtPicture
              slug={banner.slug}
              alt=""
              loading="lazy"
              sizes="287px"
              className="h-full min-h-[160px] rounded-3xl"
            />
            <div className="flex flex-col items-end justify-center gap-3 px-4 py-6 text-right">
              <h2 className="max-w-[260px] text-base leading-6 font-bold sm:text-lg">
                {banner.title}
              </h2>
              <p className="max-w-[260px] text-[13px] leading-[22px] text-muted-foreground">
                {banner.description}
              </p>
              <a
                href={banner.href}
                className="mt-1 flex h-10 w-[140px] items-center justify-center gap-2 rounded-sm bg-primary text-sm font-medium text-ink hover:bg-primary/85"
              >
                Explorar
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
