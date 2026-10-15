import { Button } from '@/components/ui/button.tsx'
import { ProvisionalIcon } from '@/components/layout/provisional-icon.tsx'

const tabItems = [
  { label: 'Home', icon: 'home', left: '36px' },
  { label: 'Shop', icon: 'shop', left: '292px' },
  { label: 'User', icon: 'user', left: '354px' },
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
        >
          <ProvisionalIcon name={item.icon} className="size-full" />
        </Button>
      ))}
    </nav>
  )
}
