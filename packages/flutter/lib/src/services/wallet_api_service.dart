import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:argos_wallet/src/models/balance_entry.dart';
import 'package:argos_wallet/src/models/external_connection.dart';
import 'package:argos_wallet/src/models/transaction_entry.dart';
import 'package:argos_wallet/src/models/wallet_config.dart';

class WalletApiException implements Exception {
  final int statusCode;
  final String message;

  const WalletApiException({required this.statusCode, required this.message});

  @override
  String toString() => 'WalletApiException($statusCode): $message';
}

class WalletApiService {
  final WalletConfig _config;
  final http.Client _client;

  WalletApiService(this._config, {http.Client? client})
      : _client = client ?? http.Client();

  Map<String, String> _headers() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (_config.authToken != null) {
      headers['Authorization'] = 'Bearer ${_config.authToken}';
    }
    return headers;
  }

  Future<List<BalanceEntry>> fetchBalances(String walletId) async {
    final response = await _client.get(
      Uri.parse('${_config.apiUrl}/v1/wallets/$walletId/balances'),
      headers: _headers(),
    );
    _checkResponse(response);
    final list = jsonDecode(response.body) as List<dynamic>;
    return list.map((e) => BalanceEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<TransactionEntry>> fetchTransactions(String walletId, {int limit = 20}) async {
    final response = await _client.get(
      Uri.parse('${_config.apiUrl}/v1/wallets/$walletId/transactions?limit=$limit'),
      headers: _headers(),
    );
    _checkResponse(response);
    final list = jsonDecode(response.body) as List<dynamic>;
    return list.map((e) => TransactionEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<TransactionEntry> sendCrypto({
    required String walletId,
    required String network,
    required String cryptoSymbol,
    required String amount,
    required String toAddress,
  }) async {
    final response = await _client.post(
      Uri.parse('${_config.apiUrl}/v1/transactions/crypto-transfer'),
      headers: _headers(),
      body: jsonEncode({
        'walletId': walletId,
        'network': network,
        'cryptoSymbol': cryptoSymbol,
        'amount': amount,
        'toAddress': toAddress,
      }),
    );
    _checkResponse(response);
    return TransactionEntry.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<TransactionEntry> fiatToCrypto({
    required String walletId,
    required String bankAccountId,
    required String amount,
    required String sourceCurrency,
    required String targetCrypto,
    required String network,
  }) async {
    final response = await _client.post(
      Uri.parse('${_config.apiUrl}/v1/transactions/fiat-to-crypto'),
      headers: _headers(),
      body: jsonEncode({
        'walletId': walletId,
        'bankAccountId': bankAccountId,
        'amount': amount,
        'sourceCurrency': sourceCurrency,
        'targetCrypto': targetCrypto,
        'network': network,
      }),
    );
    _checkResponse(response);
    return TransactionEntry.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<TransactionEntry> cryptoToFiat({
    required String walletId,
    required String network,
    required String cryptoSymbol,
    required String amount,
    required String targetCurrency,
    required String targetBankAccountId,
  }) async {
    final response = await _client.post(
      Uri.parse('${_config.apiUrl}/v1/transactions/crypto-to-fiat'),
      headers: _headers(),
      body: jsonEncode({
        'walletId': walletId,
        'network': network,
        'cryptoSymbol': cryptoSymbol,
        'amount': amount,
        'targetCurrency': targetCurrency,
        'targetBankAccountId': targetBankAccountId,
      }),
    );
    _checkResponse(response);
    return TransactionEntry.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<ExternalConnection> linkExternal({
    required String walletId,
    required String provider,
    int? chainId,
  }) async {
    final body = <String, dynamic>{
      'walletId': walletId,
      'provider': provider,
    };
    if (chainId != null) {
      body['chainId'] = chainId;
    }
    final response = await _client.post(
      Uri.parse('${_config.apiUrl}/v1/wallets/$walletId/link-external'),
      headers: _headers(),
      body: jsonEncode(body),
    );
    _checkResponse(response);
    return ExternalConnection.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<List<ExternalConnection>> getExternalConnections(String walletId) async {
    final response = await _client.get(
      Uri.parse('${_config.apiUrl}/v1/wallets/$walletId/external-connections'),
      headers: _headers(),
    );
    _checkResponse(response);
    final list = jsonDecode(response.body) as List<dynamic>;
    return list.map((e) => ExternalConnection.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> unlinkExternal({
    required String walletId,
    required String connectionId,
  }) async {
    final response = await _client.delete(
      Uri.parse('${_config.apiUrl}/v1/wallets/$walletId/unlink-external/$connectionId'),
      headers: _headers(),
    );
    _checkResponse(response);
  }

  void _checkResponse(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw WalletApiException(
        statusCode: response.statusCode,
        message: response.body,
      );
    }
  }
}
