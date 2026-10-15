import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { NftUpdatedEvent, SpikeNft } from '../../contracts/spike-nft.ts'
import { spikeNftQueryKey } from '../../app/query-client.ts'
import { http } from '../../lib/http/client.ts'
import { createSpikeSocket } from '../../lib/realtime/socket.ts'

async function fetchSpikeNft(): Promise<SpikeNft> {
  const response = await http.get<SpikeNft>('/spike/nft')
  return response.data
}

export function useSpikeNft() {
  const queryClient = useQueryClient()
  const [socketStatus, setSocketStatus] = useState('connecting')

  const nftQuery = useQuery({
    queryKey: spikeNftQueryKey,
    queryFn: fetchSpikeNft,
  })

  const bumpPrice = useMutation({
    mutationFn: async () => {
      await http.post('/spike/nft/price')
    },
  })

  useEffect(() => {
    const socket = createSpikeSocket()

    const markConnected = () => {
      setSocketStatus('connected')
    }

    const markError = (error: Error) => {
      setSocketStatus(`error: ${error.message}`)
    }

    const applyUpdate = (event: NftUpdatedEvent) => {
      queryClient.setQueryData<SpikeNft>(spikeNftQueryKey, (current) => {
        if (!current || event.nftId !== current.id) {
          return current
        }
        if (event.version <= current.version) {
          return current
        }
        return {
          ...current,
          price: event.price,
          version: event.version,
        }
      })
    }

    socket.on('connect', markConnected)
    socket.on('connect_error', markError)
    socket.on('nft.updated', applyUpdate)
    if (socket.connected) {
      markConnected()
    }

    return () => {
      socket.off('connect', markConnected)
      socket.off('connect_error', markError)
      socket.off('nft.updated', applyUpdate)
      socket.close()
    }
  }, [queryClient])

  return {
    nft: nftQuery.data,
    isLoading: nftQuery.isLoading,
    isError: nftQuery.isError,
    socketStatus,
    bumpPrice: () => {
      bumpPrice.mutate()
    },
    isBumping: bumpPrice.isPending,
  }
}
