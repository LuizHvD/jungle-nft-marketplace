import { useSpikeNft } from './use-spike-nft.ts'

export function SpikePage() {
  const { nft, isLoading, isError, socketStatus, bumpPrice, isBumping } =
    useSpikeNft()

  return (
    <main>
      <h1>Spike Socket.IO</h1>
      <p data-testid="socket-status">{socketStatus}</p>
      {isLoading ? <p>Carregando preço…</p> : null}
      {isError ? <p>Não foi possível carregar o NFT.</p> : null}
      {nft ? (
        <>
          <p>{nft.name}</p>
          <p data-testid="nft-price">{nft.price}</p>
        </>
      ) : null}
      <button type="button" onClick={bumpPrice} disabled={isBumping}>
        Alterar preço
      </button>
    </main>
  )
}
