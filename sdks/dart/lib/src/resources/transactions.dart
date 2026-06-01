import '../resource_base.dart';
import '../models/transaction.dart';

class TransactionResource extends ArgosResource {
  TransactionResource(super.client);

  Future<Transaction> transfer({
    required String walletId,
    required String network,
    required String token,
    required String amount,
    required String toAddress,
  }) async {
    final json = await client.post('/v1/transactions/transfer', {
      'wallet_id': walletId,
      'network': network,
      'token': token,
      'amount': amount,
      'to_address': toAddress,
    });
    return Transaction.fromJson(json);
  }

  Future<Transaction> fiatToCrypto({
    required String walletId,
    required String amount,
    required String sourceCurrency,
    required String targetCrypto,
    required String network,
    String? bankAccountId,
  }) async {
    final json = await client.post('/v1/transactions/fiat-to-crypto', {
      'wallet_id': walletId,
      'amount': amount,
      'source_currency': sourceCurrency,
      'target_crypto': targetCrypto,
      'network': network,
      if (bankAccountId != null) 'bank_account_id': bankAccountId,
    });
    return Transaction.fromJson(json);
  }

  Future<Transaction> cryptoToFiat({
    required String walletId,
    required String network,
    required String cryptoSymbol,
    required String amount,
    required String targetCurrency,
    required String targetBankAccountId,
  }) async {
    final json = await client.post('/v1/transactions/crypto-to-fiat', {
      'wallet_id': walletId,
      'network': network,
      'crypto_symbol': cryptoSymbol,
      'amount': amount,
      'target_currency': targetCurrency,
      'target_bank_account_id': targetBankAccountId,
    });
    return Transaction.fromJson(json);
  }

  Future<Transaction> get(String txId) async {
    final json = await client.get('/v1/transactions/$txId');
    return Transaction.fromJson(json);
  }

  Future<List<Transaction>> list({
    String? walletId,
    String? type,
    String? status,
    int? limit,
    int? offset,
  }) async {
    final params = <String>[];
    if (walletId != null) params.add('wallet_id=$walletId');
    if (type != null) params.add('type=$type');
    if (status != null) params.add('status=$status');
    if (limit != null) params.add('limit=$limit');
    if (offset != null) params.add('offset=$offset');
    final qs = params.isEmpty ? '' : '?${params.join('&')}';
    final json = await client.get('/v1/transactions$qs');
    final list = json as List? ?? [];
    return list.map((t) => Transaction.fromJson(t as Map<String, dynamic>)).toList();
  }

  Future<Transaction> cancel(String txId) async {
    final json = await client.post('/v1/transactions/$txId/cancel');
    return Transaction.fromJson(json);
  }
}
