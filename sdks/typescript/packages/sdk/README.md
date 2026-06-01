# @argos-wallet/sdk

[![npm](https://img.shields.io/badge/npm-%40argos--wallet%2Fsdk-blue)](https://www.npmjs.com/package/@argos-wallet/sdk)

Official TypeScript SDK for **Argos Wallet** — self-hosted multi-tenant wallet infrastructure for Web3.

## Install

```bash
npm install @argos-wallet/sdk
# or
pnpm add @argos-wallet/sdk
# or
yarn add @argos-wallet/sdk
```

## Quick Start

```typescript
import { Argos } from '@argos-wallet/sdk';

const argos = new Argos({
  apiKey: 'ow_your_api_key',
  apiUrl: 'http://localhost:8080', // your self-hosted instance
});

// Create a wallet
const wallet = await argos.wallets.create({
  externalId: 'user-123',
  networks: ['polygon', 'ethereum'],
});
console.log(`Polygon address: ${wallet.addresses.polygon}`);

// List transactions
const txs = await argos.transactions.list({ walletId: wallet.id });

// Create routing rule (auto-sweep)
const rule = await argos.routing.create({
  walletId: wallet.id,
  name: 'Auto-sweep USDC',
  type: 'sweep',
  conditions: { network: 'polygon', token: 'USDC', threshold: '500' },
  actions: { amount: 'all', targetWalletId: wallet.id },
});

// Sign message for authentication
const { signature, address } = await argos.identity.signMessage({
  walletId: wallet.id,
  message: 'auth-challenge-123',
});

// Verify signature
const { valid } = await argos.identity.verifySignature({
  message: 'auth-challenge-123',
  signature,
  address,
});

// Set up webhooks
await argos.webhooks.create({
  url: 'https://yourapp.com/webhooks/argos',
  events: ['transaction.confirmed', 'wallet.created'],
});
```

## Resources

| Resource | Methods |
|---|---|
| `argos.wallets` | `create`, `get`, `getAddresses`, `getBalances`, `deactivate`, `linkExternal`, `listConnections`, `unlinkExternal` |
| `argos.transactions` | `list`, `get`, `transfer`, `cancel` |
| `argos.routing` | `create`, `list`, `get`, `execute`, `delete`, `listExecutions` |
| `argos.identity` | `signMessage`, `verifySignature`, `signTransaction` |
| `argos.webhooks` | `create`, `list`, `delete` |

## Error Handling

```typescript
import { Argos, APIError } from '@argos-wallet/sdk';

try {
  const wallet = await argos.wallets.get('invalid-id');
} catch (err) {
  if (err instanceof APIError) {
    console.error(`API error ${err.statusCode}: ${err.message}`);
  }
}
```

## License

BSL 1.1 — See [LICENSE](https://github.com/2mes4/argos-wallet/blob/main/LICENSE)
