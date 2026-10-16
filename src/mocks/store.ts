import type { DemoState } from './db.ts'
import { createSeed } from './fixtures/seed.ts'

export type StateMutation<T> = {
  state: DemoState
  result: T
}

export type StateStore = {
  withState: <T>(
    mutate: (state: DemoState) => Promise<StateMutation<T>> | StateMutation<T>,
  ) => Promise<T>
}

type OrderHold = {
  entered: () => void
  gate: Promise<void>
}

let activeStore: StateStore | null = null
let orderHold: OrderHold | null = null
let memorySnapshot: DemoState | null = null

export function installStore(store: StateStore): void {
  activeStore = store
}

export function getStore(): StateStore {
  if (!activeStore) {
    throw new Error('O estado do mock ainda não foi instalado.')
  }
  return activeStore
}

export function withState<T>(
  mutate: (state: DemoState) => Promise<StateMutation<T>> | StateMutation<T>,
): Promise<T> {
  return getStore().withState(mutate)
}

export function holdNextOrderCommit(): {
  entered: Promise<void>
  release: () => void
} {
  let entered!: () => void
  let release!: () => void
  const enteredPromise = new Promise<void>((resolve) => {
    entered = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  orderHold = { entered, gate }
  return { entered: enteredPromise, release }
}

async function waitForOrderHold(
  before: DemoState,
  after: DemoState,
): Promise<void> {
  if (!orderHold || after.orders.length === before.orders.length) {
    return
  }
  const hold = orderHold
  orderHold = null
  hold.entered()
  await hold.gate
}

export function createMemoryStore(initial: DemoState): StateStore {
  let current = structuredClone(initial)
  memorySnapshot = current
  let tail = Promise.resolve()

  return {
    withState(mutate) {
      const run = tail.then(async () => {
        const before = structuredClone(current)
        const outcome = await mutate(structuredClone(current))
        await waitForOrderHold(before, outcome.state)
        current = outcome.state
        memorySnapshot = current
        return outcome.result
      })
      tail = run.then(
        () => undefined,
        () => undefined,
      )
      return run
    },
  }
}

export function readMemoryState(): DemoState {
  if (!memorySnapshot) {
    throw new Error('O estado em memória não está ativo.')
  }
  return structuredClone(memorySnapshot)
}

const DB_NAME = 'jungle-demo'
const STORE_NAME = 'state'
const STATE_KEY = 'state'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

let databasePromise: Promise<IDBDatabase> | null = null

function database(): Promise<IDBDatabase> {
  databasePromise ??= openDatabase()
  return databasePromise
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readState(fallback: DemoState): Promise<DemoState> {
  const db = await database()
  const stored = await requestResult(
    db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .get(STATE_KEY),
  )
  if (!stored) {
    return structuredClone(fallback)
  }
  return stored as DemoState
}

async function writeState(state: DemoState): Promise<void> {
  const db = await database()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  transaction.objectStore(STORE_NAME).put(state, STATE_KEY)
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export function createIndexedDbStore(): StateStore {
  let seedPromise: Promise<DemoState> | null = null
  const seed = () => {
    seedPromise ??= createSeed()
    return seedPromise
  }

  return {
    async withState(mutate) {
      return navigator.locks.request('jungle-demo', async () => {
        const initial = await seed()
        const before = await readState(initial)
        const outcome = await mutate(structuredClone(before))
        await waitForOrderHold(before, outcome.state)
        await writeState(outcome.state)
        return outcome.result
      })
    },
  }
}
