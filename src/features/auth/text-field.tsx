import type { UseFormRegisterReturn } from 'react-hook-form'

type TextFieldProps = {
  id: string
  label: string
  type?: string
  autoComplete?: string
  error?: string
  registration: UseFormRegisterReturn
}

export function TextField({
  id,
  label,
  type = 'text',
  autoComplete,
  error,
  registration,
}: TextFieldProps) {
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-[45px] w-full min-w-0 max-w-full rounded-[10px] border border-border bg-surface px-3 text-inherit aria-invalid:border-destructive"
        {...registration}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
