import { formatEth } from '@/lib/format-eth.ts'

type MoneySummaryProps = {
  subtotal: string
  discount: string
  fee: string
  total: string
  definitive: boolean
}

export function MoneySummary({
  subtotal,
  discount,
  fee,
  total,
  definitive,
}: MoneySummaryProps) {
  return (
    <section
      aria-label="Payment Summary"
      className="flex flex-col gap-2 text-sm"
    >
      <Row label="Subtotal" value={subtotal} testId="money-subtotal" />
      <Row label="Desconto" value={discount} testId="money-discount" />
      <Row label="Taxa" value={fee} testId="money-fee" />
      <p className="mt-2 flex items-baseline justify-between text-base">
        <span>Total</span>
        <span className="text-right">
          <span className="block text-xl font-bold text-brand">
            {formatEth(total)}
          </span>
          <span
            data-testid="money-total"
            className="text-xs text-muted-foreground"
          >
            {total}
          </span>
        </span>
      </p>
      <p
        data-testid="quote-definitive"
        className="text-xs text-muted-foreground"
      >
        {definitive ? 'Cotação definitiva' : 'Cotação preliminar'}
      </p>
    </section>
  )
}

function Row({
  label,
  value,
  testId,
}: {
  label: string
  value: string
  testId: string
}) {
  return (
    <p className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="text-right">
        <span className="block">{formatEth(value)}</span>
        <span data-testid={testId} className="text-xs text-muted-foreground">
          {value}
        </span>
      </span>
    </p>
  )
}
