import 'package:flutter_test/flutter_test.dart';
import 'package:argos_wallet/argos_wallet.dart';

void main() {
  group('BalanceEntry', () {
    test('fromJson parses all fields', () {
      final json = {
        'network': 'ethereum',
        'token': 'ETH',
        'balance': '1.5',
        'decimals': 18,
      };
      final entry = BalanceEntry.fromJson(json);
      expect(entry.network, 'ethereum');
      expect(entry.token, 'ETH');
      expect(entry.balance, '1.5');
      expect(entry.decimals, 18);
    });
  });

  group('TransactionEntry', () {
    test('fromJson parses all fields', () {
      final json = {
        'id': 'tx-123',
        'type': 'CRYPTO_TRANSFER',
        'status': 'COMPLETED',
        'sourceCurrency': 'ETH',
        'targetCurrency': 'ETH',
        'sourceAmount': '0.5',
        'network': 'ethereum',
        'createdAt': '2025-01-15T10:30:00Z',
        'txHash': '0xabc123',
      };
      final entry = TransactionEntry.fromJson(json);
      expect(entry.id, 'tx-123');
      expect(entry.type, 'CRYPTO_TRANSFER');
      expect(entry.status, 'COMPLETED');
      expect(entry.sourceCurrency, 'ETH');
      expect(entry.targetCurrency, 'ETH');
      expect(entry.sourceAmount, '0.5');
      expect(entry.network, 'ethereum');
      expect(entry.createdAt, DateTime.parse('2025-01-15T10:30:00Z'));
      expect(entry.txHash, '0xabc123');
    });

    test('fromJson handles null txHash', () {
      final json = {
        'id': 'tx-456',
        'type': 'FIAT_TO_CRYPTO',
        'status': 'PENDING',
        'sourceCurrency': 'USD',
        'targetCurrency': 'BTC',
        'sourceAmount': '100',
        'network': 'bitcoin',
        'createdAt': '2025-02-20T14:00:00Z',
      };
      final entry = TransactionEntry.fromJson(json);
      expect(entry.txHash, isNull);
    });
  });

  group('ExternalConnection', () {
    test('fromJson parses all fields', () {
      final json = {
        'id': 'conn-1',
        'provider': 'metamask',
        'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        'chainId': 1,
        'connectedAt': '2025-03-10T08:00:00Z',
      };
      final conn = ExternalConnection.fromJson(json);
      expect(conn.id, 'conn-1');
      expect(conn.provider, 'metamask');
      expect(conn.address, '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18');
      expect(conn.chainId, 1);
      expect(conn.connectedAt, DateTime.parse('2025-03-10T08:00:00Z'));
    });
  });

  group('WalletConfig', () {
    test('stores api url and optional auth token', () {
      const config = WalletConfig(apiUrl: 'https://api.example.com');
      expect(config.apiUrl, 'https://api.example.com');
      expect(config.authToken, isNull);

      const configWithAuth = WalletConfig(
        apiUrl: 'https://api.example.com',
        authToken: 'token123',
      );
      expect(configWithAuth.authToken, 'token123');
    });
  });

  group('WalletState', () {
    test('has sensible defaults', () {
      const state = WalletState();
      expect(state.walletId, isNull);
      expect(state.balances, isEmpty);
      expect(state.loading, false);
      expect(state.error, isNull);
    });
  });
}
