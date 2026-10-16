import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  walletConnectionSchema,
  walletCreateSchema,
  walletSchema,
  type Wallet,
} from '@/contracts/wallets.ts'
import { applyFieldErrors, focusFirstInvalid, zodResolver } from '@/lib/forms/zod-resolver.ts'
import { http } from '@/lib/http/client.ts'
import { apiErrorMessage } from '@/lib/http/error.ts'

import { TextField } from '@/features/auth/text-field.tsx'
import { commitOwnedWallet, readActorStamp } from '@/lib/session/owned-cache.ts'

type WalletValues = {
  label: string
  address: string
  role: 'primary' | 'secondary'
}

type Network = 'demo-mainnet' | 'demo-l2'

export function WalletRow({ wallet }: { wallet: Wallet }) {
  const client = useQueryClient()
  const form = useForm<WalletValues>({
    resolver: zodResolver(walletCreateSchema),
    defaultValues: {
      label: wallet.label,
      address: wallet.address,
      role: wallet.role,
    },
  })
  const [network, setNetwork] = useState<Network>(
    wallet.connection.network ?? 'demo-mainnet',
  )
  const save = useMutation({
    retry: 0,
    mutationFn: async (values: WalletValues) => {
      const stamp = readActorStamp()
      const response = await http.patch(`/wallets/${wallet.id}`, values)
      return { wallet: walletSchema.parse(response.data), stamp }
    },
    onSuccess: ({ wallet: next, stamp }) => {
      if (!stamp || !commitOwnedWallet(client, stamp, next)) {
        return
      }
      form.reset({
        label: next.label,
        address: next.address,
        role: next.role,
      })
    },
  })
  const connect = useMutation({
    retry: 0,
    mutationFn: async (action: 'connect' | 'disconnect' | 'reject') => {
      const stamp = readActorStamp()
      const body = walletConnectionSchema.parse({ network, action })
      const response = await http.post(`/wallets/${wallet.id}/connection`, body)
      return { wallet: walletSchema.parse(response.data), stamp }
    },
    onSuccess: ({ wallet: next, stamp }) => {
      if (!stamp || !commitOwnedWallet(client, stamp, next)) {
        return
      }
      setNetwork(next.connection.network ?? network)
    },
  })
  const labelId = `label-${wallet.id}`
  const addressId = `address-${wallet.id}`
  const roleId = `role-${wallet.id}`
  const networkId = `network-${wallet.id}`

  return (
    <article aria-busy={save.isPending || connect.isPending}>
      <p className="break-all">
        {wallet.label} {wallet.address} {wallet.role} {wallet.connection.status}{' '}
        {wallet.connection.network ?? ''}
      </p>
      <form
        aria-label={`Editar ${wallet.label}`}
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await save.mutateAsync(values)
          } catch (error) {
            if (applyFieldErrors(form, error)) {
              return
            }
            form.setError('root', {
              message: apiErrorMessage(error, 'Não foi possível salvar a carteira.'),
            })
          }
        }, focusFirstInvalid)}
      >
        <TextField
          id={labelId}
          label="Rótulo"
          error={form.formState.errors.label?.message}
          registration={form.register('label')}
        />
        <TextField
          id={addressId}
          label="Endereço"
          error={form.formState.errors.address?.message}
          registration={form.register('address')}
        />
        <label htmlFor={roleId}>Papel</label>
        <select id={roleId} {...form.register('role')}>
          <option value="primary">primary</option>
          <option value="secondary">secondary</option>
        </select>
        {form.formState.errors.root?.message ? (
          <p role="alert">{form.formState.errors.root.message}</p>
        ) : null}
        <button type="submit" aria-busy={save.isPending} disabled={save.isPending}>
          Salvar carteira
        </button>
      </form>
      <label htmlFor={networkId}>Rede</label>
      <select
        id={networkId}
        value={network}
        onChange={(event) => setNetwork(event.target.value as Network)}
      >
        <option value="demo-mainnet">demo-mainnet</option>
        <option value="demo-l2">demo-l2</option>
      </select>
      <button
        type="button"
        disabled={connect.isPending}
        onClick={() => void connect.mutateAsync('connect')}
      >
        connect
      </button>
      <button
        type="button"
        disabled={connect.isPending}
        onClick={() => void connect.mutateAsync('disconnect')}
      >
        disconnect
      </button>
      <button
        type="button"
        disabled={connect.isPending}
        onClick={() => void connect.mutateAsync('reject')}
      >
        reject
      </button>
    </article>
  )
}
