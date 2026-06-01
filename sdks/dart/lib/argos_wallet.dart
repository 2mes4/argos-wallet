/// Argos Wallet — Dart/Flutter SDK
///
/// Self-hosted multi-tenant wallet infrastructure for Web3.
///
/// ```dart
/// final client = ArgosClient(
///   apiUrl: 'http://localhost:8080',
///   apiKey: 'ow_your_api_key',
/// );
///
/// final wallet = await client.wallets.create(
///   externalId: 'user-123',
///   networks: ['polygon', 'ethereum'],
/// );
/// ```
library argos_wallet;

export 'src/client.dart';
export 'src/resources/wallets.dart';
export 'src/resources/transactions.dart';
export 'src/resources/routing.dart';
export 'src/resources/identity.dart';
export 'src/resources/webhooks.dart';
export 'src/models/wallet.dart';
export 'src/models/transaction.dart';
export 'src/models/routing_rule.dart';
export 'src/models/external_connection.dart';
export 'src/models/webhook.dart';
