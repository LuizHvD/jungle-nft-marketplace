import type { DemoState } from '../db.ts'
import { hashPassword } from '../passwords.ts'
import { adaWalletAddress, biaWalletAddress, demoAccounts } from './accounts.ts'

export const demoClock = '2026-10-15T12:00:00.000Z'

export async function createSeed(): Promise<DemoState> {
  const users = await Promise.all(
    demoAccounts.map(async (account) => ({
      id: account.id,
      email: account.email,
      name: account.name,
      passwordSalt: account.salt,
      passwordHash: await hashPassword(account.salt, account.password),
    })),
  )

  return {
    clock: demoClock,
    scenario: null,
    failure: null,
    couponMode: null,
    orderOutcome: 'pending',
    users,
    sessions: [],
    profiles: demoAccounts.map((account) => ({
      id: account.id,
      email: account.email,
      name: account.name,
      avatarId: null,
    })),
    nfts: [
      {
        id: 'nft-aurora',
        name: 'Aurora',
        version: 1,
        editions: [
          {
            id: 'edition-aurora-1',
            price: '1.500000000000000000',
            availableSupply: 4,
          },
        ],
      },
      {
        id: 'nft-moss',
        name: 'Moss',
        version: 1,
        editions: [
          {
            id: 'edition-moss-1',
            price: '0.250000000000000000',
            availableSupply: 1,
          },
        ],
      },
      {
        id: 'nft-sold',
        name: 'Sold Out',
        version: 1,
        editions: [
          {
            id: 'edition-sold-1',
            price: '3.000000000000000000',
            availableSupply: 0,
          },
        ],
      },
    ],
    carts: [
      {
        actorId: 'user-ada',
        items: [
          {
            id: 'cart-ada-aurora',
            nftId: 'nft-aurora',
            editionId: 'edition-aurora-1',
            quantity: 1,
          },
        ],
      },
      {
        actorId: 'user-bia',
        items: [
          {
            id: 'cart-bia-moss',
            nftId: 'nft-moss',
            editionId: 'edition-moss-1',
            quantity: 1,
          },
        ],
      },
    ],
    favorites: [
      { userId: 'user-ada', nftIds: ['nft-aurora'] },
      { userId: 'user-bia', nftIds: ['nft-moss'] },
    ],
    wallets: [
      {
        id: 'wallet-ada',
        userId: 'user-ada',
        label: 'Principal da Ada',
        address: adaWalletAddress,
        role: 'primary',
        connection: { network: 'demo-mainnet', status: 'connected' },
      },
      {
        id: 'wallet-bia',
        userId: 'user-bia',
        label: 'Principal da Bia',
        address: biaWalletAddress,
        role: 'primary',
        connection: { network: 'demo-l2', status: 'disconnected' },
      },
    ],
    quotes: [],
    orders: [
      {
        id: 'order-ada-1',
        actorId: 'user-ada',
        quoteId: 'quote-ada-seed',
        status: 'confirmed',
        version: 1,
        snapshot: {
          items: [
            {
              nftId: 'nft-aurora',
              editionId: 'edition-aurora-1',
              quantity: 1,
              unitPrice: '1.000000000000000000',
            },
          ],
          subtotal: '1.000000000000000000',
          discount: '0.000000000000000000',
          fee: '0.002000000000000000',
          total: '1.002000000000000000',
          couponCode: null,
        },
      },
      {
        id: 'order-bia-1',
        actorId: 'user-bia',
        quoteId: 'quote-bia-seed',
        status: 'pending',
        version: 1,
        snapshot: {
          items: [
            {
              nftId: 'nft-moss',
              editionId: 'edition-moss-1',
              quantity: 1,
              unitPrice: '2.000000000000000000',
            },
          ],
          subtotal: '2.000000000000000000',
          discount: '0.000000000000000000',
          fee: '0.002000000000000000',
          total: '2.002000000000000000',
          couponCode: null,
        },
      },
    ],
    idempotency: [],
    coupons: [
      {
        code: 'GREEN10',
        basisPoints: 1000,
        expiresAt: '2026-12-31T23:59:59.000Z',
      },
      {
        code: 'OLD20',
        basisPoints: 2000,
        expiresAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    networks: [
      { id: 'demo-mainnet', fee: '0.002000000000000000' },
      { id: 'demo-l2', fee: '0.000100000000000000' },
    ],
  }
}
