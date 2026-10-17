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
    <section aria-label="Payment Summary" className="flex flex-col gap-[8px]">
      <p>
        Subtotal <span data-testid="money-subtotal">{subtotal}</span>
      </p>
      <p>
        Desconto <span data-testid="money-discount">{discount}</span>
      </p>
      <p>
        Taxa <span data-testid="money-fee">{fee}</span>
      </p>
      <p>
        Total <span data-testid="money-total">{total}</span>
      </p>
      <p data-testid="quote-definitive">
        {definitive ? 'Cotação definitiva' : 'Cotação preliminar'}
      </p>
    </section>
  )
}
