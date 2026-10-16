import { delay } from 'msw'
import type { FailureMode } from './db.ts'
import { ApiError } from './errors.ts'
import { hangUntilAbort, jsonError } from './http.ts'
import { withState } from './store.ts'

type GuardArgs = {
  request: Request
  params: Record<string, string | ReadonlyArray<string> | undefined>
}

export function withoutDrop(failure: FailureMode): FailureMode | null {
  const next: FailureMode = { ...failure }
  delete next.drop
  if (!next.latencyMs && !next.status && !next.code) {
    return null
  }
  return next
}

export async function applyFailure(
  request: Request,
  options?: { deferDrop?: boolean },
): Promise<Response | null> {
  const effect = await withState((state) => {
    const failure = state.failure
    if (!failure) {
      return { state, result: null as FailureMode | null }
    }
    if (failure.drop && !options?.deferDrop) {
      return {
        state: { ...state, failure: withoutDrop(failure) },
        result: failure,
      }
    }
    return { state, result: failure }
  })

  if (!effect) {
    return null
  }
  if (effect.latencyMs && effect.latencyMs > 0) {
    await delay(effect.latencyMs)
  }
  if (effect.drop && !options?.deferDrop) {
    return hangUntilAbort(request)
  }
  if (effect.status && effect.code) {
    return jsonError(
      new ApiError(effect.status, effect.code, 'Falha simulada.'),
    )
  }
  return null
}

export function guard(
  handler: (args: GuardArgs) => Promise<Response>,
  options?: { deferDrop?: boolean },
): (args: GuardArgs) => Promise<Response> {
  return async (args) => {
    try {
      const failure = await applyFailure(args.request, options)
      if (failure) {
        return failure
      }
      return await handler(args)
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonError(error)
      }
      throw error
    }
  }
}
