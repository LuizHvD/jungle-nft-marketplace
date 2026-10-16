import type { OrderStatus } from '../domain/events.ts'

export type StoredUser = {
  id: string
  email: string
  name: string
  passwordSalt: string
  passwordHash: string
}

export type Session = {
  token: string
  userId: string
  expiresAt: string
}

export type Profile = {
  id: string
  email: string
  name: string
  avatarId: string | null
}

export type Edition = {
  id: string
  price: string
  availableSupply: number
}

export type Nft = {
  id: string
  name: string
  version: number
  editions: Edition[]
}

export type CartItem = {
  id: string
  nftId: string
  editionId: string
  quantity: number
}

export type Cart = {
  actorId: string
  items: CartItem[]
}

export type FavoriteList = {
  userId: string
  nftIds: string[]
}

export type Wallet = {
  id: string
  userId: string
  label: string
  address: string
  role: 'primary' | 'secondary'
  connection: {
    network: 'demo-mainnet' | 'demo-l2' | null
    status: 'disconnected' | 'connected' | 'rejected'
  }
}

export type QuoteItem = {
  nftId: string
  editionId: string
  quantity: number
  unitPrice: string
}

export type Quote = {
  id: string
  actorId: string
  version: number
  items: QuoteItem[]
  couponCode: string | null
  subtotal: string
  discount: string
  fee: string
  total: string
  expiresAt: string
  definitive: boolean
  network: 'demo-mainnet' | 'demo-l2' | null
  walletId: string | null
}

export type Order = {
  id: string
  actorId: string
  quoteId: string
  status: OrderStatus
  version: number
  snapshot: {
    items: QuoteItem[]
    subtotal: string
    discount: string
    fee: string
    total: string
    couponCode: string | null
  }
}

export type IdempotencyRecord = {
  actorId: string
  key: string
  payloadHash: string
  orderId: string
}

export type Coupon = {
  code: string
  basisPoints: number
  expiresAt: string
}

export type NetworkFee = {
  id: 'demo-mainnet' | 'demo-l2'
  fee: string
}

export type FailureMode = {
  latencyMs?: number
  status?: number
  code?:
    | 'VALIDATION'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'TRANSIENT'
    | 'CONFLICT'
  drop?: boolean
}

export type DemoState = {
  clock: string
  scenario: string | null
  failure: FailureMode | null
  couponMode: 'invalid' | 'expired' | null
  orderOutcome: OrderStatus
  users: StoredUser[]
  sessions: Session[]
  profiles: Profile[]
  nfts: Nft[]
  carts: Cart[]
  favorites: FavoriteList[]
  wallets: Wallet[]
  quotes: Quote[]
  orders: Order[]
  idempotency: IdempotencyRecord[]
  coupons: Coupon[]
  networks: NetworkFee[]
}

export function findEdition(
  state: DemoState,
  nftId: string,
  editionId: string,
): { nft: Nft; edition: Edition } | null {
  const nft = state.nfts.find((item) => item.id === nftId)
  const edition = nft?.editions.find((item) => item.id === editionId)
  if (!nft || !edition) {
    return null
  }
  return { nft, edition }
}

export function findCart(state: DemoState, actorId: string): Cart {
  const existing = state.carts.find((cart) => cart.actorId === actorId)
  if (existing) {
    return existing
  }
  const created: Cart = { actorId, items: [] }
  state.carts.push(created)
  return created
}
