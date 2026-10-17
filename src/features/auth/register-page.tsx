import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'

import { registerSchema, sessionSchema } from '@/contracts/auth.ts'
import {
  applyFieldErrors,
  focusFirstInvalid,
  zodResolver,
} from '@/lib/forms/zod-resolver.ts'
import { http } from '@/lib/http/client.ts'
import { apiErrorMessage } from '@/lib/http/error.ts'
import { markMergeFailed } from '@/lib/commerce/checkout-draft.ts'
import { mergeGuestCart } from '@/lib/commerce/merge-guest-cart.ts'
import { safeReturnTo } from '@/lib/session/return-to.ts'
import { adoptSession } from '@/lib/session/session.ts'

import { AuthScreen } from './auth-screen.tsx'
import { TextField } from './text-field.tsx'

type RegisterValues = {
  name: string
  email: string
  password: string
}

export function RegisterPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const search = useSearch({ strict: false })
  const returnTo =
    typeof search.returnTo === 'string' ? search.returnTo : undefined
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  })
  const registerAccount = useMutation({
    retry: 0,
    mutationFn: async (values: RegisterValues) => {
      const response = await http.post('/auth/register', values)
      return sessionSchema.parse(response.data)
    },
  })
  const rootError = form.formState.errors.root?.message

  return (
    <AuthScreen title="Criar perfil" returnTo={returnTo}>
      <form
        id="register-form"
        aria-label="Form"
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            const session = await registerAccount.mutateAsync(values)
            const merged = await mergeGuestCart(session.token)
            if (merged === 'failed') {
              markMergeFailed()
            }
            adoptSession(queryClient, session)
            await navigate({ href: safeReturnTo(returnTo) })
          } catch (error) {
            if (applyFieldErrors(form, error)) {
              return
            }
            form.setError('root', {
              message: apiErrorMessage(error, 'Não foi possível cadastrar.'),
            })
          }
        }, focusFirstInvalid)}
      >
        <TextField
          id="name"
          label="Nome"
          autoComplete="name"
          error={form.formState.errors.name?.message}
          registration={form.register('name')}
        />
        <TextField
          id="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          registration={form.register('email')}
        />
        <TextField
          id="password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          registration={form.register('password')}
        />
        {rootError ? <p role="alert">{rootError}</p> : null}
      </form>
      <button
        type="submit"
        form="register-form"
        aria-busy={registerAccount.isPending}
        disabled={registerAccount.isPending}
        className="h-12 w-full rounded-md bg-primary text-base font-semibold text-ink hover:bg-primary/85 disabled:opacity-50"
      >
        Criar perfil
      </button>
      <p className="text-center text-sm text-muted-foreground">
        Ou continue com
      </p>
      <button
        type="button"
        disabled
        className="h-11 w-full rounded-md border border-border text-sm"
      >
        Continuar com Google
      </button>
      <button
        type="button"
        disabled
        className="h-11 w-full rounded-md border border-border text-sm"
      >
        Continuar com Facebook
      </button>
      <Link
        to="/login"
        search={returnTo ? { returnTo } : {}}
        className="text-center text-sm"
      >
        Já tem uma conta? Entre
      </Link>
    </AuthScreen>
  )
}
