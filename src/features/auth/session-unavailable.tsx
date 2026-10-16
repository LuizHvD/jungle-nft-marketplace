import { useQueryClient } from '@tanstack/react-query'
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'

import { SessionUnavailableError } from '@/lib/session/session.ts'
import { sessionQueryKey } from '@/lib/session/private-cache.ts'

export function SessionUnavailablePage({ error }: ErrorComponentProps) {
  const client = useQueryClient()
  const router = useRouter()
  const message =
    error instanceof SessionUnavailableError
      ? error.message
      : 'Não foi possível validar a sessão.'

  return (
    <main>
      <h1>Sessão</h1>
      <p role="alert">{message}</p>
      <button
        type="button"
        onClick={() => {
          void client.resetQueries({ queryKey: sessionQueryKey }).then(() => {
            return router.invalidate()
          })
        }}
      >
        Tentar de novo
      </button>
    </main>
  )
}
