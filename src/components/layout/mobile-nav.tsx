import { Button } from '@/components/ui/button.tsx'

const tabItems = [
  { label: 'Home', left: '36px' },
  { label: 'Shop', left: '292px' },
  { label: 'User', left: '354px' },
] as const

export function MobileNav() {
  return (
    <nav
      aria-label="Tab Bar"
      className="relative h-[126px] w-full min-[1440px]:hidden"
    >
      {tabItems.map((item) => (
        <Button
          key={item.label}
          aria-label={item.label}
          className="absolute top-[71px] size-[20px]"
          style={{ left: item.left }}
        />
      ))}
    </nav>
  )
}
