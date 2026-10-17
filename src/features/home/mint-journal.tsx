import { useState } from 'react'

import { ArtPicture } from '@/components/ui/art-picture.tsx'
import type { ArtSlug } from '@/features/catalog/nft-images.ts'

const posts: { title: string; excerpt: string; date: string; slug: ArtSlug }[] =
  [
    {
      date: '12 de setembro',
      title: 'Como o catálogo lista um NFT',
      excerpt: 'Nome, edições e o menor preço disponível.',
      slug: 'ivory',
    },
    {
      date: '13 de setembro',
      title: 'Preço que muda na hora',
      excerpt: 'O valor acompanha o evento de atualização.',
      slug: 'emerald',
    },
    {
      date: '15 de setembro',
      title: 'Edição e estoque',
      excerpt: 'Cada edição tem preço e quantidade própria.',
      slug: 'sage',
    },
    {
      date: '15 de setembro',
      title: 'Carteira da conta',
      excerpt: 'A compra usa uma carteira conectada na rede escolhida.',
      slug: 'golden',
    },
  ]

export function MintJournal() {
  const [notice, setNotice] = useState('')

  return (
    <section aria-labelledby="journal-title" className="pb-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 id="journal-title" className="text-2xl font-bold md:text-[28px]">
          Diário da Cunhagem
        </h2>
        <p className="text-sm text-muted-foreground">
          Notas curtas sobre o que este mercado já faz.
        </p>
      </div>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((post) => (
          <li key={post.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-xl bg-surface">
              <ArtPicture
                slug={post.slug}
                alt=""
                loading="lazy"
                className="aspect-[268/195] rounded-none"
              />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-xs text-muted-foreground">{post.date}</p>
                <h3 className="text-base leading-[21px] font-bold">
                  {post.title}
                </h3>
                <p className="text-xs leading-4 text-muted-foreground">
                  {post.excerpt}
                </p>
                <button
                  type="button"
                  className="mt-auto w-fit pt-1 text-xs font-bold text-brand"
                  onClick={() =>
                    setNotice('O texto completo ainda não está publicado.')
                  }
                >
                  Ler mais
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
      {notice ? (
        <p
          role="status"
          className="mt-4 text-center text-sm text-muted-foreground"
        >
          {notice}
        </p>
      ) : null}
    </section>
  )
}
