import { Skeleton } from '@/components/ui/skeleton.tsx'

export function FoundationPage() {
  return (
    <main className="flex flex-col gap-[32px]">
      <h1>Fundação</h1>
      <Skeleton data-testid="foundation-skeleton" className="h-[45px] w-full" />
      <Skeleton className="h-[45px] w-full" />
    </main>
  )
}
