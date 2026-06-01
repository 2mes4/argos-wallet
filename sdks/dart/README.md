# Argos Wallet — Dart/Flutter SDK

[![pub.dev](https://img.shields.io/badge/pub.dev-argos__wallet-blue)](https://pub.dev/packages/argos_wallet)

Self-hosted multi-tenant wallet infrastructure for Web3 applications.

## Installation

```yaml
dependencies:
  argos_wallet: ^0.2.0
```

```dart
import 'package:argos_wallet/argos_wallet.dart';
```

## Quick Start

```dart
final client = ArgosClient(
  config: ArgosConfig(
    apiUrl: 'http://localhost:8080',
    apiKey: 'ow_your_api_key',
  ),
);

// Create a wallet
final wallet = await client.wallets.create(
  externalId: 'user-123',
  networks: ['polygon', 'ethereum'],
);
print('Wallet address: ${wallet.addresses['polygon']}');

// Link MetaMask
await client.wallets.linkExternal(
  wallet.id,
  provider: 'metamask',
  address: '0x742d...',
  chainId: 137,
);

// Create routing rule
await client.routing.createRule(
  walletId: wallet.id,
  name: 'Auto-sweep USDC',
  type: 'sweep',
  conditions: {'network': 'polygon', 'token': 'USDC', 'threshold': '500'},
  actions: {'amount': 'all', 'target_wallet_id': wallet.id},
);

// Sign message for authentication
final signResult = await client.identity.signMessage(
  walletId: wallet.id,
  message: 'auth-challenge-123',
);
print('Signature: ${signResult.signature}');

// Set up webhooks
await client.webhooks.create(
  url: 'https://yourapp.com/webhooks/argos',
  events: ['transaction.confirmed', 'wallet.created'],
);
```

## Resources

| Resource | Description |
|---|---|
| `client.wallets` | Create, manage, and query wallets |
| `client.transactions` | List and manage transactions |
| `client.routing` | Create and execute routing rules |
| `client.identity` | Sign and verify messages |
| `client.webhooks` | Manage webhook endpoints |

## License

BSL 1.1 — See [LICENSE](https://github.com/2mes4/argos-wallet/blob/main/LICENSE)
