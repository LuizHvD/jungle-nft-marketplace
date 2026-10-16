import { useEffect } from 'react'

import { connectSessionSocket, disconnectSessionSocket } from '@/lib/realtime/session-socket.ts'

import { useSession } from '@/lib/session/session.ts'

export function SessionSocketBinding() {
  const session = useSession()
  const token = session.data?.token

  useEffect(() => {
    if (!token) {
      disconnectSessionSocket()
      return
    }
    connectSessionSocket(token)
  }, [token])

  return null
}
