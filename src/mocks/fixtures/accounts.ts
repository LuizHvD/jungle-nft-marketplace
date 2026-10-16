export const demoAccounts = [
  {
    id: 'user-ada',
    email: 'ada@demo.jungle',
    name: 'Ada Demo',
    password: 'ada-demo-pass',
    salt: 'salt-ada-demo',
  },
  {
    id: 'user-bia',
    email: 'bia@demo.jungle',
    name: 'Bia Demo',
    password: 'bia-demo-pass',
    salt: 'salt-bia-demo',
  },
] as const

export const adaWalletAddress = `0x${'ada'.padEnd(39, '0')}1`
export const biaWalletAddress = `0x${'bb'.padEnd(39, '0')}1`
