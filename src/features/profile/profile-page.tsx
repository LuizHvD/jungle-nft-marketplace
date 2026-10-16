import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import type { SessionResponse } from '@/contracts/auth.ts'
import {
  passwordPatchSchema,
  profilePatchSchema,
  profileSchema,
  type Profile,
} from '@/contracts/profile.ts'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { focusFirstInvalid, zodResolver } from '@/lib/forms/zod-resolver.ts'
import { http } from '@/lib/http/client.ts'
import { apiErrorCode, apiErrorMessage } from '@/lib/http/error.ts'
import { sessionQueryKey } from '@/lib/session/private-cache.ts'
import { useSession } from '@/lib/session/session.ts'
import { writeStoredSession } from '@/lib/session/storage.ts'

import { TextField } from '@/features/auth/text-field.tsx'

import { avatarOptions } from './avatar-options.ts'
import { useProfile } from './use-profile.ts'

function syncSessionName(client: QueryClient, name: string) {
  const current = client.getQueryData<SessionResponse>(sessionQueryKey)
  if (!current) {
    return
  }
  const next = { ...current, user: { ...current.user, name } }
  writeStoredSession(next)
  client.setQueryData(sessionQueryKey, next)
}

function NameForm({ profile }: { profile: Profile }) {
  const client = useQueryClient()
  const form = useForm({
    resolver: zodResolver(profilePatchSchema),
    defaultValues: { name: profile.name },
  })
  const save = useMutation({
    retry: 0,
    mutationFn: async (values: { name: string }) => {
      const response = await http.patch('/profile', values)
      return profileSchema.parse(response.data)
    },
    onSuccess: (next) => {
      client.setQueryData(['profile', next.id], next)
      syncSessionName(client, next.name)
    },
  })
  const error = form.formState.errors.name?.message

  return (
    <form
      aria-label="Nome"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await save.mutateAsync(values)
        } catch (mutationError) {
          form.setError('name', {
            message: apiErrorMessage(mutationError, 'Não foi possível salvar o nome.'),
          })
        }
      }, focusFirstInvalid)}
    >
      <TextField
        id="name"
        label="Nome"
        autoComplete="name"
        error={error}
        registration={form.register('name')}
      />
      <button type="submit" aria-busy={save.isPending} disabled={save.isPending}>
        Salvar nome
      </button>
    </form>
  )
}

function AvatarForm({ profile }: { profile: Profile }) {
  const client = useQueryClient()
  const initial = profile.name.trim().slice(0, 1)
  const save = useMutation({
    retry: 0,
    mutationFn: async (avatarId: string) => {
      const response = await http.patch('/profile/avatar', { avatarId })
      return profileSchema.parse(response.data)
    },
    onSuccess: (next) => {
      client.setQueryData(['profile', next.id], next)
    },
  })

  return (
    <div role="group" aria-label="Avatar">
      <p>
        Avatar {profile.avatarId ?? 'ausente'} {initial}
      </p>
      {avatarOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={profile.avatarId === option.id}
          aria-label={`Avatar ${option.id}`}
          disabled={save.isPending}
          className={`inline-flex rounded-full ${option.className}`}
          onClick={() => void save.mutateAsync(option.id)}
        >
          {initial}
        </button>
      ))}
    </div>
  )
}

function PasswordForm() {
  const form = useForm({
    resolver: zodResolver(passwordPatchSchema),
    defaultValues: { currentPassword: '', nextPassword: '' },
  })
  const save = useMutation({
    retry: 0,
    mutationFn: async (values: { currentPassword: string; nextPassword: string }) => {
      await http.patch('/profile/password', values)
    },
  })
  const rootError = form.formState.errors.root?.message

  return (
    <form
      aria-label="Senha"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await save.mutateAsync(values)
          form.reset()
        } catch (error) {
          if (apiErrorCode(error) === 'SESSION_EXPIRED') {
            return
          }
          if (apiErrorCode(error) === 'UNAUTHORIZED') {
            form.setError('currentPassword', {
              message: apiErrorMessage(error, 'Senha atual inválida.'),
            })
            document.getElementById('currentPassword')?.focus()
            return
          }
          form.setError('root', {
            message: apiErrorMessage(error, 'Não foi possível alterar a senha.'),
          })
        }
      }, focusFirstInvalid)}
    >
      <TextField
        id="currentPassword"
        label="Senha atual"
        type="password"
        autoComplete="current-password"
        error={form.formState.errors.currentPassword?.message}
        registration={form.register('currentPassword')}
      />
      <TextField
        id="nextPassword"
        label="Senha nova"
        type="password"
        autoComplete="new-password"
        error={form.formState.errors.nextPassword?.message}
        registration={form.register('nextPassword')}
      />
      {rootError ? <p role="alert">{rootError}</p> : null}
      <button type="submit" aria-busy={save.isPending} disabled={save.isPending}>
        Alterar senha
      </button>
    </form>
  )
}

export function ProfilePage() {
  const session = useSession()
  const profile = useProfile(session.data?.user.id)

  if (!session.data) {
    return (
      <main aria-busy="true">
        <h1>Perfil</h1>
        <Skeleton data-testid="profile-skeleton" className="h-[45px] w-full" />
      </main>
    )
  }

  if (profile.isPending) {
    return (
      <main aria-busy="true">
        <h1>Perfil</h1>
        <Skeleton data-testid="profile-skeleton" className="h-[45px] w-full" />
      </main>
    )
  }

  if (profile.isError || !profile.data) {
    return (
      <main>
        <h1>Perfil</h1>
        <p role="alert">{apiErrorMessage(profile.error, 'Não foi possível carregar o perfil.')}</p>
        <button type="button" onClick={() => void profile.refetch()}>
          Tentar de novo
        </button>
      </main>
    )
  }

  return (
    <main>
      <h1>Perfil</h1>
      <p>E-mail {profile.data.email}</p>
      <NameForm key={profile.data.name} profile={profile.data} />
      <AvatarForm profile={profile.data} />
      <PasswordForm />
    </main>
  )
}
