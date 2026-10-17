import type { Nft } from '@/contracts/nfts.ts'
import { formatEth } from '@/lib/format-eth.ts'

type EditionPickerProps = {
  editions: Nft['editions']
  selectedId: string
  onSelect: (editionId: string) => void
}

export function EditionPicker({
  editions,
  selectedId,
  onSelect,
}: EditionPickerProps) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="mb-2 w-full text-sm">Edição</legend>
      {editions.map((edition) => {
        const selected = edition.id === selectedId
        return (
          <label
            key={edition.id}
            className={`flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm ${selected ? 'border-primary bg-primary text-ink' : 'border-border'}`}
          >
            <input
              type="radio"
              name="edition"
              value={edition.id}
              checked={selected}
              className="sr-only"
              onChange={() => onSelect(edition.id)}
            />
            <span className="sr-only">{edition.price}</span>
            <span>{formatEth(edition.price)}</span>
            <span>{edition.availableSupply}</span>
          </label>
        )
      })}
    </fieldset>
  )
}
