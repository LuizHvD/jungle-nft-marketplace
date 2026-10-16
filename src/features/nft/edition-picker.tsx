import type { Nft } from '@/contracts/nfts.ts'

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
    <fieldset className="flex flex-col gap-[8px]">
      <legend>Edição</legend>
      {editions.map((edition) => (
        <label key={edition.id} className="flex items-center gap-[8px]">
          <input
            type="radio"
            name="edition"
            value={edition.id}
            checked={edition.id === selectedId}
            onChange={() => onSelect(edition.id)}
          />
          <span>{edition.price}</span>
          <span>{edition.availableSupply}</span>
        </label>
      ))}
    </fieldset>
  )
}
