# Getting Started

## Prerequisites

- Node.js >= 18.0.0
- npm >= 10.0.0
- A mnemonic phrase for HD wallet derivation (you can generate one with `npx mnemonics`)

## Installation

### 1. Install core packages

```bash
npm install @argos-wallet/core @argos-wallet/storage-memory
```

### 2. Install blockchain network providers

Choose the networks you want to support:

```bash
# Polygon (recommended for low gas fees)
npm install @argos-wallet/network-polygon

# Base (Coinbase L2)
npm install @argos-wallet/network-base

# Ethereum mainnet
npm install @argos-wallet/network-ethereum
```

### 3. Install a fiat gateway

Choose based on your region:

```bash
# Europe (SEPA)
npm install @argos-wallet/regional-sepa

# Americas (ACH, SPEI)
npm install @argos-wallet/regional-americas
```

### 4. (Optional) Install UI components

```bash
# Web Components (framework-agnostic)
npm install @argos-wallet/ui

# React SDK (hooks + components)
npm install @argos-wallet/react
```

### 5. (Optional) Flutter SDK

```yaml
# pubspec.yaml
dependencies:
  argos_wallet: ^0.1.0
```

Requires Flutter >= 3.5.0 and Dart >= 3.5.0.

## Your First Wallet

### Server-Side Setup

```typescript
// server.ts
import { Argos } from '@argos-wallet/core';
import { MemoryStorage } from '@argos-wallet/storage-memory';
import { createPolygonProvider } from '@argos-wallet/network-polygon';
import { SepaFiatProvider } from '@argos-wallet/regional-sepa';

const sdk = new Argos({
  storage: new MemoryStorage(),
  networks: [
    createPolygonProvider({
      mnemonic: process.env.MNEMONIC!,
      testnet: true, // Use Polygon Amoy testnet
    }),
  ],
  fiat: new SepaFiatProvider({ gateway: 'mock' }), // Mock for development
});

// Create a wallet
const wallet = await sdk.wallets.createWallet();
console.log('Created wallet:', wallet.walletId);
console.log('Polygon address:', wallet.addresses['polygon-amoy']);

// Store wallet.walletId in your database, linked to your user
```

### Frontend Setup — Web Components

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import '@argos-wallet/ui';
  </script>
</head>
<body>
  <argos-provider
    wallet-id="THE_WALLET_ID_FROM_SERVER"
    api-url="https://your-api.com"
    auth-token="user-jwt-token"
  >
    <argos-card></argos-card>
    <fiat-bridge-wizard></fiat-bridge-wizard>
    <tx-history-list></tx-history-list>
  </argos-provider>
</body>
</html>
```

### Frontend Setup — React

```tsx
import { useArgos, WalletCard, TransactionList } from '@argos-wallet/react';

function Dashboard({ walletId }: { walletId: string }) {
  const { balances, loading, fetchTransactions } = useArgos(
    { apiUrl: '/api/v1', authToken: 'jwt-token' },
    walletId,
  );

  return (
    <>
      <WalletCard balances={balances} loading={loading} supportedTokens={['USDC']} />
      <TransactionList transactions={[]} />
    </>
  );
}
```

### Mobile Setup — Flutter

```dart
import 'package:argos_wallet/argos_wallet.dart';

final service = WalletApiService(WalletConfig(
  apiUrl: 'https://your-api.com',
  authToken: 'jwt-token',
));

final balances = await service.fetchBalances(walletId);

// In your widget tree:
WalletCard(balances: balances, supportedTokens: ['USDC'])
```

## Next Steps

- [Architecture Overview](../architecture/OVERVIEW.md) — Understand how the SDK works
- [Creating Custom Providers](../providers/CUSTOM_PROVIDERS.md) — Add support for new chains/gateways
- [Web Components](../ui-components/COMPONENTS.md) — Customize the embeddable Web Components
- [React SDK](../react-sdk/REACT_SDK.md) — React hooks and components
- [Flutter SDK](../flutter-sdk/FLUTTER_SDK.md) — Flutter models, service, and widgets
- [API Reference](../api/REFERENCE.md) — Complete method documentation
- [Deployment](../deployment/PRODUCTION.md) — Production deployment guide
