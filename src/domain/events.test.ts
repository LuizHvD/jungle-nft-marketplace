import { describe, expect, it } from 'vitest'
import { acceptEventVersion, keepTerminalStatus } from './events.ts'

describe('versão de evento', () => {
  it('descarta evento antigo ou duplicado', () => {
    const seen = new Set(['event-1'])
    expect(acceptEventVersion(2, 1, seen, 'event-2')).toBe(false)
    expect(acceptEventVersion(2, 2, seen, 'event-2')).toBe(false)
    expect(acceptEventVersion(2, 3, seen, 'event-1')).toBe(false)
    expect(acceptEventVersion(2, 3, seen, 'event-2')).toBe(true)
  })

  it('não regride status terminal', () => {
    expect(keepTerminalStatus('confirmed', 'pending')).toBe('confirmed')
    expect(keepTerminalStatus('declined', 'confirmed')).toBe('declined')
    expect(keepTerminalStatus('pending', 'confirmed')).toBe('confirmed')
  })
})
