type QuantityFieldProps = {
  supply: number
  quantity: number
  onChange: (quantity: number) => void
}

function clampQuantity(value: number, supply: number): number {
  if (supply === 0) {
    return 0
  }
  if (value < 1) {
    return 1
  }
  if (value > supply) {
    return supply
  }
  return value
}

export function QuantityField({
  supply,
  quantity,
  onChange,
}: QuantityFieldProps) {
  const soldOut = supply === 0
  const canDecrease = supply > 0 && quantity > 1
  const canIncrease = supply > 0 && quantity < supply

  return (
    <div className="flex flex-col gap-[8px]">
      {soldOut ? <p>Edição esgotada</p> : null}
      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          aria-label="Diminuir quantidade"
          disabled={canDecrease === false}
          onClick={() => onChange(quantity - 1)}
        >
          Diminuir
        </button>
        <input
          aria-label="Quantidade"
          inputMode="numeric"
          value={String(quantity)}
          disabled={soldOut}
          onChange={(event) => {
            const next = event.target.value
            if (next.length === 0) {
              onChange(clampQuantity(0, supply))
              return
            }
            if (/^\d+$/.test(next)) {
              onChange(clampQuantity(Number(next), supply))
            }
          }}
        />
        <button
          type="button"
          aria-label="Aumentar quantidade"
          disabled={canIncrease === false}
          onClick={() => onChange(quantity + 1)}
        >
          Aumentar
        </button>
      </div>
    </div>
  )
}
