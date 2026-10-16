import { describe, expect, it } from 'vitest'
import { createSeed } from './fixtures/seed.ts'
import { demoAccounts } from './fixtures/accounts.ts'
import { hashPassword } from './passwords.ts'

describe('senhas da fixture', () => {
  it('guarda salt e hash, sem a senha em claro', async () => {
    const state = await createSeed()
    const serialized = JSON.stringify(state)

    for (const account of demoAccounts) {
      const user = state.users.find((item) => item.id === account.id)
      expect(user?.passwordSalt).toBe(account.salt)
      expect(user?.passwordHash).toBe(
        await hashPassword(account.salt, account.password),
      )
      expect(serialized.includes(account.password)).toBe(false)
    }
  })
})
