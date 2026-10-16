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
    <div className="flex flex-col">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-[45px] w-full min-w-0 max-w-full rounded-[10px] bg-surface-card text-inherit"
        {...registration}
      />
      {error ? <p id={errorId}>{error}</p> : null}
    </div>
  )
}
