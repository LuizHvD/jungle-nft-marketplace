import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { walletCreateSchema, walletSchema } from '@/contracts/wallets.ts'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import {
  applyFieldErrors,
  focusFirstInvalid,
  zodResolver,
} from '@/lib/forms/zod-resolver.ts'
import { http } from '@/lib/http/client.ts'
import { apiErrorMessage } from '@/lib/http/error.ts'
import { useSession } from '@/lib/session/session.ts'

import { AccountNav } from '@/features/account/account-nav.tsx'
import { TextField } from '@/features/auth/text-field.tsx'
import { commitOwnedWallet, readActorStamp } from '@/lib/session/owned-cache.ts'

import { useWallets } from './use-wallets.ts'
import { WalletRow } from './wallet-row.tsx'

type CreateValues = {
  label: string
  address: string
  role: 'primary' | 'secondary'
}

function CreateWalletForm() {
  const client = useQueryClient()
  const form = useForm<CreateValues>({
    resolver: zodResolver(walletCreateSchema),
    defaultValues: { label: '', address: '', role: 'secondary' },
  })
  const create = useMutation({
    retry: 0,
    mutationFn: async (values: CreateValues) => {
      const stamp = readActorStamp()
      const response = await http.post('/wallets', values)
      return { wallet: walletSchema.parse(response.data), stamp }
    },
    onSuccess: ({ wallet, stamp }) => {
      if (!stamp || !commitOwnedWallet(client, stamp, wallet)) {
        return
      }
      form.reset({ label: '', address: '', role: 'secondary' })
    },
  })

  return (
    <form
      aria-label="Nova carteira"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await create.mutateAsync(values)
        } catch (error) {
          if (applyFieldErrors(form, error)) {
            return
          }
          form.setError('root', {
            message: apiErrorMessage(
              error,
              'Não foi possível cadastrar a carteira.',
            ),
          })
        }
      }, focusFirstInvalid)}
    >
      <TextField
        id="wallet-label"
        label="Rótulo"
        error={form.formState.errors.label?.message}
        registration={form.register('label')}
      />
      <TextField
        id="wallet-address"
        label="Endereço"
        error={form.formState.errors.address?.message}
        registration={form.register('address')}
      />
      <label htmlFor="wallet-role">Papel</label>
      <select id="wallet-role" {...form.register('role')}>
        <option value="primary">primary</option>
        <option value="secondary">secondary</option>
      </select>
      {form.formState.errors.root?.message ? (
        <p role="alert">{form.formState.errors.root.message}</p>
      ) : null}
      <button
        type="submit"
        aria-busy={create.isPending}
        disabled={create.isPending}
      >
        Cadastrar carteira
      </button>
    </form>
  )
}

export function WalletsPage() {
  const session = useSession()
  const userId = session.data?.user.id
  const wallets = useWallets(userId)

  if (wallets.isPending) {
    return (
      <main aria-busy="true">
        <h1>Carteiras</h1>
        <Skeleton data-testid="wallets-skeleton" className="h-[45px] w-full" />
      </main>
    )
  }

  if (wallets.isError || !wallets.data || !userId) {
    return (
      <main>
        <h1>Carteiras</h1>
        <p role="alert">
          {apiErrorMessage(
            wallets.error,
            'Não foi possível carregar as carteiras.',
          )}
        </p>
        <button type="button" onClick={() => void wallets.refetch()}>
          Tentar de novo
        </button>
      </main>
    )
  }

  return (
    <main className="grid gap-8 py-6 md:grid-cols-[240px_minmax(0,1fr)]">
      <AccountNav />
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Carteiras</h1>
        <ul className="flex flex-col gap-4">
          {wallets.data.wallets.map((wallet) => (
            <li key={wallet.id}>
              <WalletRow wallet={wallet} />
            </li>
          ))}
        </ul>
        <CreateWalletForm />
      </div>
    </main>
  )
}
