import { useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button.tsx'
import { ProvisionalIcon } from '@/components/layout/provisional-icon.tsx'
import { useSession } from '@/lib/session/session.ts'

const tabItems = [
  { label: 'Home', icon: 'home', left: '36px' },
  { label: 'Shop', icon: 'shop', left: '292px' },
] as const

export function MobileNav() {
  const navigate = useNavigate()
  const session = useSession()

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
      <Button
        id="tab-user"
        aria-label="User"
        className="absolute top-[71px] size-[20px]"
        style={{ left: '354px' }}
        onClick={() => {
          if (session.data) {
            void navigate({ to: '/perfil' })
            return
          }
          void navigate({ to: '/login', search: { returnTo: '/perfil' } })
        }}
      >
        <ProvisionalIcon name="user" className="size-full" />
      </Button>
    </nav>
  )
}
