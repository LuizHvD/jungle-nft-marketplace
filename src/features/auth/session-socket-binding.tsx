import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import {
  connectSessionSocket,
  readActiveToken,
} from '@/lib/realtime/session-socket.ts'
import { refetchRealtime } from '@/lib/realtime/apply-realtime.ts'
import { useSession } from '@/lib/session/session.ts'

export function SessionSocketBinding() {
  const session = useSession()
  const token = session.data?.token ?? null
  const client = useQueryClient()

  useEffect(() => {
    connectSessionSocket(token, client)
  }, [token, client])

  useEffect(() => {
    const onFocus = () => {
      refetchRealtime(client, readActiveToken())
    }
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [client])

  return null
}
