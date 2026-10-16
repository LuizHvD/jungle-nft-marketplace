import type {
  FieldErrors,
  FieldPath,
  FieldValues,
  Resolver,
  UseFormReturn,
} from 'react-hook-form'
import type { z } from 'zod'

import { apiFieldErrors } from '@/lib/http/error.ts'

export function zodResolver<Schema extends z.ZodType<FieldValues>>(
  schema: Schema,
): Resolver<z.output<Schema>> {
  return async (values) => {
    const parsed = schema.safeParse(values)
    if (parsed.success) {
      return {
        values: parsed.data,
        errors: {},
      }
    }
    const errors: Record<string, { type: string; message: string }> = {}
    for (const issue of parsed.error.issues) {
      const path = issue.path.map(String).join('.')
      const name = path.length > 0 ? path : 'root'
      if (errors[name]) {
        continue
      }
      errors[name] = { type: 'validation', message: issue.message }
    }
    return {
      values: {},
      errors: errors as FieldErrors<z.output<Schema>>,
    }
  }
}

function focusNamedField(name: string): void {
  const selector = `[name="${CSS.escape(name)}"]`
  const active = document.activeElement
  const form = active instanceof HTMLElement ? active.closest('form') : null
  const scoped = form?.querySelector<HTMLElement>(selector)
  const field = scoped ?? document.querySelector<HTMLElement>(selector)
  field?.focus()
}

export function focusFirstInvalid(errors: FieldErrors<FieldValues>): void {
  for (const name of Object.keys(errors)) {
    if (name === 'root') {
      continue
    }
    focusNamedField(name)
    return
  }
}

export function applyFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
): boolean {
  const fields = apiFieldErrors(error)
  const names = Object.keys(fields)
  if (names.length === 0) {
    return false
  }
  for (const name of names) {
    form.setError(name as FieldPath<T>, { message: fields[name] })
  }
  const first = names[0]
  if (first) {
    focusNamedField(first)
  }
  return true
}
