import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'

import { ArtPicture } from '@/components/ui/art-picture.tsx'
import { cn } from '@/lib/utils.ts'
import type { ArtSlug } from '@/features/catalog/nft-images.ts'

const slides: { id: string; slug: ArtSlug; name: string }[] = [
  { id: 'nft-aurora', slug: 'emerald', name: 'Aurora' },
  { id: 'nft-moss', slug: 'golden', name: 'Moss' },
  { id: 'nft-sold', slug: 'ivory', name: 'Sold Out' },
]

export function HeroShowcase() {
  const [selected, setSelected] = useState(0)
  const slide = slides[selected] ?? slides[0]
  const next = slides[(selected + 1) % slides.length]

  return (
    <section aria-labelledby="hero-title" className="pt-6 pb-10">
      <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_300px] md:gap-8 lg:grid-cols-[minmax(0,1fr)_450px]">
        <div className="flex flex-col pt-6 lg:pt-11">
          <p className="text-sm tracking-wide">Bem-vindo à Kurio</p>
          <h1
            id="hero-title"
            className="mt-2 text-[32px] leading-[52px] font-bold tracking-wide uppercase lg:text-[44px] lg:leading-[70px]"
          >
            Seja dono do futuro
            <br />
            da arte digital
          </h1>
          <p className="mt-1 max-w-[557px] text-sm leading-6 text-muted-foreground">
            Descubra NFTs do catálogo Kurio. Colecione as edições disponíveis e
            acompanhe o preço em tempo real.
          </p>
          <a
            href="#mercado"
            className="mt-8 flex h-10 w-[140px] items-center justify-center rounded-sm bg-primary text-base font-bold text-ink hover:bg-primary/85"
          >
            EXPLORAR
          </a>
          <Dots selected={selected} onSelect={setSelected} className="mt-8" />
        </div>
        <Link
          to="/nfts/$nftId"
          params={{ nftId: slide.id }}
          aria-label={`Ver ${slide.name}`}
          className="block overflow-hidden rounded-3xl"
        >
          <ArtPicture slug={slide.slug} alt="" loading="eager" sizes="450px" />
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#5e3f25_0%,#805735_42%,#4a301c_72%,#160e0b_100%)] px-4 pt-3 pb-3 md:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_130px] gap-3">
          <div>
            <p className="text-[11px] tracking-wide">Bem-vindo à Kurio</p>
            <h1 className="mt-2 text-[17px] leading-[27px] font-bold tracking-wide uppercase">
              Seja dono da cultura digital
            </h1>
            <p className="mt-2 text-[11px] leading-[17px]">
              Descubra NFTs selecionados de criadores do mundo todo.
            </p>
            <a
              href="#mercado"
              className="mt-2 flex w-fit items-center gap-2 text-xs font-bold uppercase"
            >
              Explorar
              <ArrowRight className="size-4 text-brand" aria-hidden="true" />
            </a>
          </div>
          <div className="relative h-[140px]">
            <Link
              to="/nfts/$nftId"
              params={{ nftId: slide.id }}
              aria-label={`Ver ${slide.name}`}
            >
              <ArtPicture
                slug={slide.slug}
                alt=""
                loading="eager"
                sizes="130px"
                className="rounded-2xl"
              />
            </Link>
            <ArtPicture
              slug={next.slug}
              alt=""
              loading="lazy"
              sizes="54px"
              className="pointer-events-none absolute -bottom-2 left-3 size-[54px] rounded-xl"
            />
          </div>
        </div>
        <Dots
          selected={selected}
          onSelect={setSelected}
          className="mt-3 justify-center"
        />
      </div>
    </section>
  )
}

function Dots({
  selected,
  onSelect,
  className,
}: {
  selected: number
  onSelect: (index: number) => void
  className?: string
}) {
  return (
    <div className={cn('flex', className)}>
      {slides.map((item, index) => (
        <button
          key={item.id}
          type="button"
          aria-label={`Mostrar destaque ${index + 1}: ${item.name}`}
          aria-current={index === selected}
          className="flex size-6 items-center justify-center"
          onClick={() => onSelect(index)}
        >
          <span
            className={cn(
              'size-2 rounded-full bg-primary',
              index === selected ? 'opacity-100' : 'opacity-45',
            )}
          />
        </button>
      ))}
    </div>
  )
}
