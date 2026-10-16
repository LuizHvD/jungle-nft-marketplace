import { http, HttpResponse } from 'msw'
import {
  clockRequestSchema,
  failureRequestSchema,
  scenarioIds,
  scenarioListSchema,
  scenarioRequestSchema,
} from '../../contracts/demo.ts'
import type { NftUpdatedEvent } from '../../contracts/events.ts'
import type { DemoState, FailureMode } from '../db.ts'
import { ApiError } from '../errors.ts'
import { jsonData, jsonError } from '../http.ts'
import { parseBody, readJson } from '../parse.ts'
import { emitNftUpdated } from '../sockets.ts'
import { withState } from '../store.ts'
import { createSeed } from '../fixtures/seed.ts'

function codeForStatus(status: number): FailureMode['code'] {
  if (status === 401) {
    return 'UNAUTHORIZED'
  }
  if (status === 403) {
    return 'FORBIDDEN'
  }
  if (status === 404) {
    return 'NOT_FOUND'
  }
  if (status >= 500) {
    return 'TRANSIENT'
  }
  if (status === 409) {
    return 'CONFLICT'
  }
  return 'VALIDATION'
}

function resetModes(state: DemoState, id: string): void {
  state.scenario = id
  state.failure = null
  state.couponMode = null
  state.orderOutcome = 'pending'
}

function applyScenario(
  state: DemoState,
  id: (typeof scenarioIds)[number],
): NftUpdatedEvent | null {
  resetModes(state, id)
  if (id === 'slow') {
    state.failure = { latencyMs: 400 }
  }
  if (id === 'timeout') {
    state.failure = { drop: true }
  }
  if (id === 'validation') {
    state.failure = { status: 400, code: 'VALIDATION' }
  }
  if (id === 'unauthorized') {
    state.failure = { status: 401, code: 'UNAUTHORIZED' }
  }
  if (id === 'forbidden') {
    state.failure = { status: 403, code: 'FORBIDDEN' }
  }
  if (id === 'not-found') {
    state.failure = { status: 404, code: 'NOT_FOUND' }
  }
  if (id === 'transient') {
    state.failure = { status: 500, code: 'TRANSIENT' }
  }
  if (id === 'session-expired') {
    for (const session of state.sessions) {
      session.expiresAt = state.clock
    }
  }
  if (id === 'coupon-invalid') {
    state.couponMode = 'invalid'
  }
  if (id === 'coupon-expired') {
    state.couponMode = 'expired'
  }
  if (id === 'payment-declined') {
    state.orderOutcome = 'declined'
  }
  if (id === 'payment-confirmed') {
    state.orderOutcome = 'confirmed'
  }
  if (id === 'price-change') {
    const nft = state.nfts.find((item) => item.id === 'nft-aurora')
    const edition = nft?.editions[0]
    if (!nft || !edition) {
      throw new ApiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    }
    nft.version += 1
    edition.price = '2.000000000000000000'
    return {
      eventId: crypto.randomUUID(),
      nftId: nft.id,
      editionId: edition.id,
      version: nft.version,
      price: edition.price,
      availableSupply: edition.availableSupply,
    }
  }
  if (id === 'sold-out') {
    const nft = state.nfts.find((item) => item.id === 'nft-moss')
    const edition = nft?.editions[0]
    if (!nft || !edition) {
      throw new ApiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    }
    nft.version += 1
    edition.availableSupply = 0
    return {
      eventId: crypto.randomUUID(),
      nftId: nft.id,
      editionId: edition.id,
      version: nft.version,
      price: edition.price,
      availableSupply: 0,
    }
  }
  return null
}

export const demoHandlers = [
  http.get('/api/demo/scenarios', () => {
    return jsonData(scenarioListSchema, { scenarios: [...scenarioIds] })
  }),
  http.post('/api/demo/scenario', async ({ request }) => {
    try {
      const body = parseBody(scenarioRequestSchema, await readJson(request))
      const event = await withState((state) => ({
        state,
        result: applyScenario(state, body.id),
      }))
      if (event) {
        await emitNftUpdated(event)
      }
      return HttpResponse.json({ id: body.id })
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonError(error)
      }
      throw error
    }
  }),
  http.post('/api/demo/reset', async () => {
    await withState(async () => ({ state: await createSeed(), result: null }))
    return HttpResponse.json({ ok: true })
  }),
  http.post('/api/demo/clock', async ({ request }) => {
    try {
      const body = parseBody(clockRequestSchema, await readJson(request))
      const clock = new Date(Date.parse(body.now)).toISOString()
      await withState((state) => {
        state.clock = clock
        return { state, result: clock }
      })
      return HttpResponse.json({ now: clock })
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonError(error)
      }
      throw error
    }
  }),
  http.post('/api/demo/failures', async ({ request }) => {
    try {
      const body = parseBody(failureRequestSchema, await readJson(request))
      const failure = await withState((state) => {
        const next: FailureMode | null =
          body.latencyMs === undefined &&
          body.status === undefined &&
          body.drop === undefined
            ? null
            : {
                ...(body.latencyMs === undefined
                  ? {}
                  : { latencyMs: body.latencyMs }),
                ...(body.status === undefined
                  ? {}
                  : { status: body.status, code: codeForStatus(body.status) }),
                ...(body.drop ? { drop: true } : {}),
              }
        state.failure = next
        return { state, result: next }
      })
      return HttpResponse.json({ failure })
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonError(error)
      }
      throw error
    }
  }),
]
