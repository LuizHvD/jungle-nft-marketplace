import { useQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { Skeleton } from '@/components/ui/skeleton.tsx'
import { apiErrorMessage } from '@/lib/http/error.ts'
import { useSession } from '@/lib/session/session.ts'
import { nftQueryOptions } from '@/features/nft/use-nft.ts'

import { CommerceStatus } from '@/features/commerce/status.tsx'

import { useFavorites, useToggleFavorite } from './use-favorites.ts'

export function FavoritesPage() {
  const session = useSession()
  const userId = session.data?.user.id
  const favorites = useFavorites(userId)
  const toggle = useToggleFavorite(userId)
  const ids = favorites.data?.nftIds ?? []
  const details = useQueries({
    queries: ids.map((nftId) => nftQueryOptions(nftId)),
  })
  const message = toggle.isError
    ? apiErrorMessage(toggle.error, 'Não foi possível atualizar o favorito.')
    : toggle.isSuccess
      ? 'Favorito atualizado.'
      : ''

  return (
    <main className="flex flex-col gap-[4px] min-[1440px]:gap-[96px]">
      <h1>Favoritos</h1>
      <CommerceStatus message={message} />
      {favorites.isPending ? (
        <Skeleton data-testid="favorites-skeleton" className="h-[45px] w-full" />
      ) : null}
      {favorites.isError ? (
        <p>{apiErrorMessage(favorites.error, 'Não foi possível listar os favoritos.')}</p>
      ) : null}
      {favorites.isSuccess && ids.length === 0 ? <p>Nenhum favorito.</p> : null}
      <ul className="flex flex-col gap-[8px]">
        {ids.map((nftId, index) => {
          const nft = details[index]?.data
          return (
            <li key={nftId} data-testid={`favorite-${nftId}`}>
              <Link to="/nfts/$nftId" params={{ nftId }}>
                {nft?.name ?? nftId}
              </Link>
              <button
                type="button"
                aria-pressed="true"
                disabled={toggle.isPending}
                onClick={() => {
                  void toggle.mutate({ nftId, favorite: false })
                }}
              >
                Remover favorito
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
