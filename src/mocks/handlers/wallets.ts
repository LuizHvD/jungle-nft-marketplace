import { http } from 'msw'
import {
  walletConnectionSchema,
  walletCreateSchema,
  walletListSchema,
  walletPatchSchema,
  walletSchema,
} from '../../contracts/wallets.ts'
import { bearerToken, requireUser } from '../actor.ts'
import { ApiError } from '../errors.ts'
import { guard } from '../failures.ts'
import { jsonData } from '../http.ts'
import { parseBody, readJson } from '../parse.ts'
import { withState } from '../store.ts'

function presentWallet(wallet: {
  id: string
  label: string
  address: string
  role: 'primary' | 'secondary'
  connection: {
    network: 'demo-mainnet' | 'demo-l2' | null
    status: 'disconnected' | 'connected' | 'rejected'
  }
}) {
  return walletSchema.parse({
    id: wallet.id,
    label: wallet.label,
    address: wallet.address,
    role: wallet.role,
    connection: wallet.connection,
  })
}

export const walletHandlers = [
  http.get(
    '/api/wallets',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const wallets = await withState((state) => {
        const userId = requireUser(state, token)
        return {
          state,
          result: walletListSchema.parse({
            wallets: state.wallets
              .filter((wallet) => wallet.userId === userId)
              .map((wallet) => presentWallet(wallet)),
          }),
        }
      })
      return jsonData(walletListSchema, wallets)
    }),
  ),
  http.post(
    '/api/wallets',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const body = parseBody(walletCreateSchema, await readJson(request))
      const wallet = await withState((state) => {
        const userId = requireUser(state, token)
        const created = {
          id: crypto.randomUUID(),
          userId,
          label: body.label,
          address: body.address,
          role: body.role,
          connection: {
            network: null,
            status: 'disconnected' as const,
          },
        }
        state.wallets.push(created)
        return { state, result: presentWallet(created) }
      })
      return jsonData(walletSchema, wallet)
    }),
  ),
  http.patch(
    '/api/wallets/:id',
    guard(async ({ request, params }) => {
      const token = bearerToken(request)
      const walletId = String(params.id)
      const body = parseBody(walletPatchSchema, await readJson(request))
      const wallet = await withState((state) => {
        const userId = requireUser(state, token)
        const current = state.wallets.find((item) => item.id === walletId)
        if (!current) {
          throw new ApiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
        }
        if (current.userId !== userId) {
          throw new ApiError(403, 'FORBIDDEN', 'Carteira de outro ator.')
        }
        if (body.label) {
          current.label = body.label
        }
        if (body.address) {
          current.address = body.address
        }
        if (body.role) {
          current.role = body.role
        }
        return { state, result: presentWallet(current) }
      })
      return jsonData(walletSchema, wallet)
    }),
  ),
  http.post(
    '/api/wallets/:id/connection',
    guard(async ({ request, params }) => {
      const token = bearerToken(request)
      const walletId = String(params.id)
      const body = parseBody(walletConnectionSchema, await readJson(request))
      const wallet = await withState((state) => {
        const userId = requireUser(state, token)
        const current = state.wallets.find((item) => item.id === walletId)
        if (!current) {
          throw new ApiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
        }
        if (current.userId !== userId) {
          throw new ApiError(403, 'FORBIDDEN', 'Carteira de outro ator.')
        }
        current.connection = {
          network: body.network,
          status:
            body.action === 'connect'
              ? 'connected'
              : body.action === 'reject'
                ? 'rejected'
                : 'disconnected',
        }
        return { state, result: presentWallet(current) }
      })
      return jsonData(walletSchema, wallet)
    }),
  ),
]
