export const avatarOptions = [
  { id: 'primary', className: 'bg-primary text-ink' },
  { id: 'surface', className: 'bg-surface-card' },
  { id: 'ink', className: 'bg-ink' },
] as const

export type AvatarOptionId = (typeof avatarOptions)[number]['id']
