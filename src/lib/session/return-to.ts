const privatePaths = [
  '/perfil',
  '/carteiras',
  '/checkout',
  '/favoritos',
  '/pedidos',
] as const

export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string') {
    return '/'
  }
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('://') && !value.includes('\\')) {
    return value
  }
  return '/'
}

export function closeAuthTarget(value: string | undefined): string {
  const safe = safeReturnTo(value)
  const path = safe.split(/[?#]/)[0] ?? safe
  const blocked = privatePaths.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
  if (blocked) {
    return '/'
  }
  return safe
}
