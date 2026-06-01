# Flutter SDK — `argos_wallet`

Flutter package with Dart models, an HTTP API service, and Material 3 widgets for the Argos Wallet SDK. Targets Flutter 3.5+ and Dart 3.5+.

## Installation

```yaml
# pubspec.yaml
dependencies:
  argos_wallet: ^0.1.0
```

```bash
flutter pub get
```

## Models

### WalletConfig

API configuration passed to the service.

```dart
import 'package:argos_wallet/argos_wallet.dart';

const config = WalletConfig(
  apiUrl: 'https://api.example.com',
  authToken: 'user-jwt', // optional
);
```

### BalanceEntry

Token balance on a specific network.

```dart
const balance = BalanceEntry(
  network: 'polygon',
  token: 'USDC',
  balance: '100.50',
  decimals: 6,
);

// From API JSON:
final balance = BalanceEntry.fromJson(json);
```

### TransactionEntry

A wallet transaction with full details.

```dart
const tx = TransactionEntry(
  id: 'tx-001',
  type: 'FIAT_TO_CRYPTO',
  status: 'COMPLETED',
  sourceCurrency: 'EUR',
  targetCurrency: 'USDC',
  sourceAmount: '100',
  network: 'polygon',
  createdAt: DateTime(2024, 1, 15),
);

// From API JSON:
final tx = TransactionEntry.fromJson(json);
```

### ExternalConnection

A linked external wallet (MetaMask, WalletConnect, etc.).

```dart
const conn = ExternalConnection(
  id: 'conn-001',
  provider: 'metamask',
  address: '0x742d...',
  chainId: 137,
  connectedAt: DateTime(2024, 1, 1),
);

// From API JSON:
final conn = ExternalConnection.fromJson(json);
```

### WalletState

Current wallet state (balances, loading, error).

```dart
const state = WalletState(
  walletId: 'wallet-uuid',
  balances: [balance1, balance2],
  loading: false,
  error: null,
);
```

---

## API Service

### `WalletApiService`

HTTP client for the wallet REST API. Uses the `http` package.

```dart
import 'package:argos_wallet/argos_wallet.dart';

final service = WalletApiService(WalletConfig(
  apiUrl: 'https://api.example.com',
  authToken: 'jwt...',
));
```

### Methods

| Method | HTTP | Endpoint | Returns |
|--------|------|----------|---------|
| `fetchBalances(walletId)` | GET | `/v1/wallets/$walletId/balances` | `List<BalanceEntry>` |
| `fetchTransactions(walletId, {limit})` | GET | `/v1/wallets/$walletId/transactions?limit=$limit` | `List<TransactionEntry>` |
| `sendCrypto(...)` | POST | `/v1/transactions/crypto-transfer` | `TransactionEntry` |
| `fiatToCrypto(...)` | POST | `/v1/transactions/fiat-to-crypto` | `TransactionEntry` |
| `cryptoToFiat(...)` | POST | `/v1/transactions/crypto-to-fiat` | `TransactionEntry` |
| `linkExternal(...)` | POST | `/v1/wallets/$walletId/link-external` | `ExternalConnection` |
| `getExternalConnections(walletId)` | GET | `/v1/wallets/$walletId/external-connections` | `List<ExternalConnection>` |
| `unlinkExternal(...)` | DELETE | `/v1/wallets/$walletId/unlink-external/$connectionId` | `void` |

### Error Handling

All non-2xx responses throw `WalletApiException`:

```dart
try {
  final balances = await service.fetchBalances(walletId);
} on WalletApiException catch (e) {
  print('API error ${e.statusCode}: ${e.message}');
}
```

### Method Signatures

```dart
Future<List<BalanceEntry>> fetchBalances(String walletId);

Future<List<TransactionEntry>> fetchTransactions(String walletId, {int limit = 20});

Future<TransactionEntry> sendCrypto({
  required String walletId,
  required String network,
  required String cryptoSymbol,
  required String amount,
  required String toAddress,
});

Future<TransactionEntry> fiatToCrypto({
  required String walletId,
  required String bankAccountId,
  required String amount,
  required String sourceCurrency,
  required String targetCrypto,
  required String network,
});

Future<TransactionEntry> cryptoToFiat({
  required String walletId,
  required String network,
  required String cryptoSymbol,
  required String amount,
  required String targetCurrency,
  required String targetBankAccountId,
});

Future<ExternalConnection> linkExternal({
  required String walletId,
  required String provider,
  int? chainId,
});

Future<List<ExternalConnection>> getExternalConnections(String walletId);

Future<void> unlinkExternal({
  required String walletId,
  required String connectionId,
});
```

---

## Widgets

All widgets follow Material 3 design guidelines and are stateless (or manage minimal local state).

### `WalletCard`

Displays token balances with optional filtering.

```dart
WalletCard(
  balances: balances,
  loading: false,
  error: null,
  supportedTokens: ['USDC', 'EURC'],
  activeNetwork: 'polygon',
)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `balances` | `List<BalanceEntry>` | Balance entries to display |
| `loading` | `bool` | Show loading indicator |
| `error` | `String?` | Show error text |
| `supportedTokens` | `List<String>?` | Filter by token symbols (case-insensitive) |
| `activeNetwork` | `String?` | Filter by network slug |

**Widget keys for testing:**
- `Key('wallet-card-loading')` — loading state
- `Key('wallet-card-error')` — error state
- `Key('wallet-card-empty')` — empty state
- `Key('balance-{token}-{network}')` — individual balance rows

---

### `ConnectWalletButton`

Connect/disconnect toggle with truncated address display.

```dart
ConnectWalletButton(
  connected: false,
  address: null,
  onConnect: () => handleConnect(),
  onDisconnect: () => handleDisconnect(),
)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `onConnect` | `VoidCallback?` | Called when connect button is pressed |
| `onDisconnect` | `VoidCallback?` | Called when disconnect button is pressed |
| `connected` | `bool` | Whether a wallet is connected |
| `address` | `String?` | Connected address (displayed truncated) |

**Widget key for testing:** `Key('connect-wallet-btn')`

---

### `TransactionList`

Scrollable list of transactions with type labels and status badges.

```dart
TransactionList(
  transactions: txList,
  loading: false,
)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `transactions` | `List<TransactionEntry>` | Transaction entries |
| `loading` | `bool` | Show loading indicator |

**Type labels:**

| Type | Label |
|------|-------|
| `FIAT_TO_CRYPTO` | Deposit |
| `CRYPTO_TO_FIAT` | Withdrawal |
| `CRYPTO_TRANSFER` | Transfer |
| `SMART_CONTRACT_CALL` | Contract Call |

**Widget keys for testing:**
- `Key('tx-list-loading')` — loading state
- `Key('tx-list-empty')` — empty state
- `Key('tx-{id}')` — individual transaction rows

---

## Full Example

```dart
import 'package:flutter/material.dart';
import 'package:argos_wallet/argos_wallet.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Argos Wallet Demo',
      theme: ThemeData(useMaterial3: true),
      home: const WalletScreen(),
    );
  }
}

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  late final WalletApiService _service;
  List<BalanceEntry> _balances = [];
  List<TransactionEntry> _transactions = [];
  bool _loading = true;
  bool _connected = false;
  String? _address;

  static const _walletId = 'your-wallet-id';

  @override
  void initState() {
    super.initState();
    _service = WalletApiService(WalletConfig(
      apiUrl: 'https://api.example.com',
      authToken: 'jwt-token',
    ));
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      _balances = await _service.fetchBalances(_walletId);
      _transactions = await _service.fetchTransactions(_walletId);
    } on WalletApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.message}')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Wallet')),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          children: [
            ConnectWalletButton(
              connected: _connected,
              address: _address,
              onConnect: () {
                setState(() {
                  _connected = true;
                  _address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18';
                });
              },
              onDisconnect: () {
                setState(() {
                  _connected = false;
                  _address = null;
                });
              },
            ),
            WalletCard(
              balances: _balances,
              loading: _loading,
              supportedTokens: ['USDC', 'EURC', 'POL'],
            ),
            TransactionList(
              transactions: _transactions,
              loading: _loading,
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## Testing

The Flutter SDK includes 25 tests.

```bash
cd packages/flutter
flutter test
```

**Test coverage:**
- `models_test.dart` (7 tests) — all model constructors, fromJson, default values
- `widgets_test.dart` (12 tests) — WalletCard (loading, error, empty, normal, filtering), ConnectWalletButton (connect, disconnect, address display), TransactionList (loading, empty, normal, labels)
- `service_test.dart` (6 tests) — JSON parsing, error handling, header verification, POST body, DELETE method
