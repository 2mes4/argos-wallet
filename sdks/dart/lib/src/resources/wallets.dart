import '../client.dart';
import '../models/wallet.dart';
import '../models/external_connection.dart';

class WalletResource extends Resource {
  WalletResource(super.client);

  Future<Wallet> create({String? externalId, List<String>? networks}) async {
    final json = await client.post('/v1/wallets', {
      if (externalId != null) 'external_id': externalId,
      if (networks != null) 'networks': networks,
    });
    return Wallet.fromJson(json);
  }

  Future<Wallet> get(String walletId) async {
    final json = await client.get('/v1/wallets/$walletId');
    return Wallet.fromJson(json);
  }

  Future<List<Balance>> getBalances(String walletId) async {
    final json = await client.get('/v1/wallets/$walletId/balances');
    final list = json['balances'] as List? ?? json as List? ?? [];
    return list.map((b) => Balance.fromJson(b as Map<String, dynamic>)).toList();
  }

  Future<List<WalletAddress>> getAddresses(String walletId) async {
    final json = await client.get('/v1/wallets/$walletId/addresses');
    final list = json as List? ?? [];
    return list
        .map((a) => WalletAddress.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  Future<void> deactivate(String walletId) async {
    await client.delete('/v1/wallets/$walletId');
  }

  Future<ExternalConnection> linkExternal(
    String walletId, {
    required String provider,
    required String address,
    required int chainId,
    String? signature,
  }) async {
    final json = await client.post('/v1/wallets/$walletId/connections', {
      'provider': provider,
      'address': address,
      'chain_id': chainId,
      if (signature != null) 'signature': signature,
    });
    return ExternalConnection.fromJson(json);
  }

  Future<List<ExternalConnection>> listConnections(String walletId) async {
    final json = await client.get('/v1/wallets/$walletId/connections');
    final list = json as List? ?? [];
    return list
        .map((c) => ExternalConnection.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  Future<void> unlinkExternal(String walletId, String connectionId) async {
    await client.delete('/v1/wallets/$walletId/connections/$connectionId');
  }
}

class WalletAddress {
  final String id;
  final String walletId;
  final String network;
  final String address;
  final bool isDefault;

  const WalletAddress({
    required this.id,
    required this.walletId,
    required this.network,
    required this.address,
    required this.isDefault,
  });

  factory WalletAddress.fromJson(Map<String, dynamic> json) {
    return WalletAddress(
      id: json['id'] as String,
      walletId: json['wallet_id'] as String,
      network: json['network'] as String,
      address: json['address'] as String,
      isDefault: json['is_default'] as bool? ?? false,
    );
  }
}
