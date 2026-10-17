export type OrderStatus = 'pending' | 'confirmed' | 'declined'

export function acceptEventVersion(
  currentVersion: number,
  incomingVersion: number,
  seenEventIds: ReadonlySet<string>,
  eventId: string,
): boolean {
  if (seenEventIds.has(eventId)) {
    return false
  }
  return incomingVersion > currentVersion
}

export function keepTerminalStatus(
  current: OrderStatus,
  incoming: OrderStatus,
): OrderStatus {
  if (current === 'confirmed' || current === 'declined') {
    return current
  }
  return incoming
}

export function acceptsOrderStatus(
  current: OrderStatus,
  incoming: OrderStatus,
): boolean {
  if (current === 'pending') {
    return true
  }
  return current === incoming
}
