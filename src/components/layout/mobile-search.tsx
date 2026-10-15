import { Button } from '@/components/ui/button.tsx'

export function MobileSearch() {
  return (
    <div className="flex w-full max-w-[366px] items-center gap-[8px]">
      <div
        aria-hidden="true"
        className="h-[45px] min-w-0 flex-1 rounded-[10px] bg-surface-card pt-[12px] pr-[129px] pb-[12px] pl-[12px]"
      />
      <Button
        variant="primary"
        aria-label="Iconly/Curved/Filter"
        className="size-[45px] shrink-0 rounded-[14px] p-[12px]"
      />
    </div>
  )
}
