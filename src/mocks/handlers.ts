import { authHandlers } from './handlers/auth.ts'
import { cartHandlers } from './handlers/cart.ts'
import { demoHandlers } from './handlers/demo.ts'
import { favoriteHandlers } from './handlers/favorites.ts'
import { nftHandlers } from './handlers/nfts.ts'
import { orderHandlers } from './handlers/orders.ts'
import { profileHandlers } from './handlers/profile.ts'
import { quoteHandlers } from './handlers/quotes.ts'
import { spikeHandlers } from './handlers/spike.ts'
import { walletHandlers } from './handlers/wallets.ts'

export const handlers = [
  ...demoHandlers,
  ...spikeHandlers,
  ...authHandlers,
  ...profileHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...walletHandlers,
  ...orderHandlers,
]
