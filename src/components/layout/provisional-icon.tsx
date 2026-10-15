type ProvisionalIconName = 'home' | 'shop' | 'user' | 'filter'

const iconPaths: Record<ProvisionalIconName, string> = {
  home: 'M4 9 L10 4 L16 9 V16 H12 V12 H8 V16 H4 Z',
  shop: 'M6 8 H14 L13 16 H7 Z M8 8 V7 A2 2 0 0 1 12 7 V8',
  user: 'M10 5 A2.2 2.2 0 1 1 9.9 5 M5 16 C6 12 14 12 15 16 Z',
  filter: 'M4 5 H16 L12 10 V15 L8 13 V10 Z',
}

type ProvisionalIconProps = {
  name: ProvisionalIconName
  className?: string
}

export function ProvisionalIcon({ name, className }: ProvisionalIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      data-fallback="provisional"
      className={className}
    >
      <path d={iconPaths[name]} fill="currentColor" />
    </svg>
  )
}
