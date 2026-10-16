import { z } from 'zod'
import { ApiError } from './errors.ts'

export function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.')
    const name = key.length > 0 ? key : 'body'
    if (fields[name]) {
      continue
    }
    fields[name] = issue.message
  }
  return fields
}

export function parseBody<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data)
  if (parsed.success) {
    return parsed.data
  }
  throw new ApiError(
    400,
    'VALIDATION',
    'Dados inválidos.',
    fieldErrorsFromZod(parsed.error),
  )
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
