export function CommerceStatus({ message }: { message: string }) {
  return (
    <p role="status" aria-live="polite" data-testid="commerce-status">
      {message}
    </p>
  )
}
