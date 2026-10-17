type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

let localOverride: KeyValueStore | null = null
let sessionOverride: KeyValueStore | null = null
const memoryLocal = new Map<string, string>()
const memorySession = new Map<string, string>()

function memory(items: Map<string, string>): KeyValueStore {
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }
}

function browserStore(
  override: KeyValueStore | null,
  kind: 'local' | 'session',
  fallback: Map<string, string>,
): KeyValueStore {
  if (override) {
    return override
  }
  if (typeof window === 'undefined') {
    return memory(fallback)
  }
  return kind === 'local' ? window.localStorage : window.sessionStorage
}

export function setCommerceStores(input: {
  local?: KeyValueStore | null
  session?: KeyValueStore | null
}): void {
  if ('local' in input) {
    localOverride = input.local ?? null
  }
  if ('session' in input) {
    sessionOverride = input.session ?? null
  }
}

export function resetCommerceMemory(): void {
  memoryLocal.clear()
  memorySession.clear()
}

export function commerceLocal(): KeyValueStore {
  return browserStore(localOverride, 'local', memoryLocal)
}

export function commerceSession(): KeyValueStore {
  return browserStore(sessionOverride, 'session', memorySession)
}
