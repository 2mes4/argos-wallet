import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:argos_wallet/argos_wallet.dart';

class FakeHttpClient extends http.BaseClient {
  final http.Response Function(http.Request) handler;

  FakeHttpClient(this.handler);

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final req = http.Request(request.method, request.url)
      ..headers.addAll(request.headers);
    if (request is http.Request && request.body.isNotEmpty) {
      req.body = request.body;
    }
    final response = handler(req);
    return http.StreamedResponse(
      Stream.value(response.bodyBytes),
      response.statusCode,
      headers: response.headers,
    );
  }
}

void main() {
  group('WalletApiService', () {
    late WalletConfig config;

    setUp(() {
      config = const WalletConfig(
        apiUrl: 'https://api.example.com',
        authToken: 'test-token',
      );
    });

    test('fetchBalances parses JSON correctly', () async {
      final fakeClient = FakeHttpClient((req) {
        expect(req.method, 'GET');
        expect(req.url.toString(), 'https://api.example.com/v1/wallets/w1/balances');
        expect(req.headers['Authorization'], 'Bearer test-token');
        return http.Response(
          jsonEncode([
            {'network': 'ethereum', 'token': 'ETH', 'balance': '1.5', 'decimals': 18},
            {'network': 'polygon', 'token': 'MATIC', 'balance': '100', 'decimals': 18},
          ]),
          200,
        );
      });

      final service = WalletApiService(config, client: fakeClient);
      final balances = await service.fetchBalances('w1');

      expect(balances.length, 2);
      expect(balances[0].token, 'ETH');
      expect(balances[0].balance, '1.5');
      expect(balances[1].token, 'MATIC');
      expect(balances[1].network, 'polygon');
    });

    test('non-2xx throws WalletApiException', () async {
      final fakeClient = FakeHttpClient((req) {
        return http.Response('Not Found', 404);
      });

      final service = WalletApiService(config, client: fakeClient);
      expect(
        () => service.fetchBalances('w1'),
        throwsA(isA<WalletApiException>().having(
          (e) => e.statusCode,
          'statusCode',
          404,
        )),
      );
    });

    test('fetchTransactions parses correctly', () async {
      final fakeClient = FakeHttpClient((req) {
        expect(req.url.toString(), 'https://api.example.com/v1/wallets/w1/transactions?limit=10');
        return http.Response(
          jsonEncode([
            {
              'id': 'tx-1',
              'type': 'CRYPTO_TRANSFER',
              'status': 'COMPLETED',
              'sourceCurrency': 'ETH',
              'targetCurrency': 'ETH',
              'sourceAmount': '1.0',
              'network': 'ethereum',
              'createdAt': '2025-01-15T10:30:00Z',
              'txHash': '0xabc',
            },
          ]),
          200,
        );
      });

      final service = WalletApiService(config, client: fakeClient);
      final txs = await service.fetchTransactions('w1', limit: 10);

      expect(txs.length, 1);
      expect(txs[0].id, 'tx-1');
      expect(txs[0].type, 'CRYPTO_TRANSFER');
      expect(txs[0].txHash, '0xabc');
    });

    test('sendCrypto posts correct body', () async {
      final fakeClient = FakeHttpClient((req) {
        expect(req.method, 'POST');
        expect(req.url.toString(), 'https://api.example.com/v1/transactions/crypto-transfer');
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        expect(body['walletId'], 'w1');
        expect(body['network'], 'ethereum');
        expect(body['cryptoSymbol'], 'ETH');
        expect(body['amount'], '0.5');
        expect(body['toAddress'], '0xrecipient');
        return http.Response(
          jsonEncode({
            'id': 'tx-2',
            'type': 'CRYPTO_TRANSFER',
            'status': 'PENDING',
            'sourceCurrency': 'ETH',
            'targetCurrency': 'ETH',
            'sourceAmount': '0.5',
            'network': 'ethereum',
            'createdAt': '2025-01-15T10:30:00Z',
          }),
          200,
        );
      });

      final service = WalletApiService(config, client: fakeClient);
      final tx = await service.sendCrypto(
        walletId: 'w1',
        network: 'ethereum',
        cryptoSymbol: 'ETH',
        amount: '0.5',
        toAddress: '0xrecipient',
      );
      expect(tx.id, 'tx-2');
    });

    test('unlinkExternal sends DELETE', () async {
      final fakeClient = FakeHttpClient((req) {
        expect(req.method, 'DELETE');
        expect(req.url.toString(), 'https://api.example.com/v1/wallets/w1/unlink-external/conn-1');
        return http.Response('', 204);
      });

      final service = WalletApiService(config, client: fakeClient);
      await service.unlinkExternal(walletId: 'w1', connectionId: 'conn-1');
    });

    test('config without auth token omits Authorization header', () async {
      final noAuthConfig = const WalletConfig(apiUrl: 'https://api.example.com');
      final fakeClient = FakeHttpClient((req) {
        expect(req.headers['Authorization'], isNull);
        return http.Response(jsonEncode([]), 200);
      });

      final service = WalletApiService(noAuthConfig, client: fakeClient);
      await service.fetchBalances('w1');
    });
  });
}
