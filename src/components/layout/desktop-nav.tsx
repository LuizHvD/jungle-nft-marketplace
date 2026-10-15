import { Button } from '@/components/ui/button.tsx'

const desktopNavLabels = ['Mercado', 'Criadores', 'Aprenda'] as const

export function DesktopNav() {
  return (
    <nav
      aria-label="Nav"
      className="hidden min-w-0 flex-1 min-[1440px]:flex min-[1440px]:justify-evenly"
    >
      {desktopNavLabels.map((label) => (
        <Button key={label}>{label}</Button>
      ))}
    </nav>
  )
}
