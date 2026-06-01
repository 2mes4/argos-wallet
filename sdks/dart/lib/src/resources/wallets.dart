import '../resource_base.dart';
import '../models/wallet.dart';
import '../models/external_connection.dart';

/// Wallet management resource for creating and managing wallets.
class WalletResource extends ArgosResource {
  WalletResource(super.client);

  /// Creates a new wallet with addresses on the specified networks.
  ///
  /// ```dart
  /// final wallet = await client.wallets.create(
  ///   externalId: 'user-123',
  ///   networks: ['polygon', 'ethereum'],
  /// );
  /// ```
  Future<Wallet> create({String? externalId, List<String>? networks}) async {
    final json = await client.post('/v1/wallets', {
      if (externalId != null) 'external_id': externalId,
      if (networks != null) 'networks': networks,
    });
    return Wallet.fromJson(json);
  }

  /// Gets a wallet by ID.
  Future<Wallet> get(String walletId) async {
    final json = await client.get('/v1/wallets/$walletId');
    return Wallet.fromJson(json);
  }

  /// Gets the balances for a wallet across all networks.
  Future<List<Balance>> getBalances(String walletId) async {
    final json = await client.get('/v1/wallets/$walletId/balances');
    final list = json['balances'] as List? ?? json as List? ?? [];
    return list.map((b) => Balance.fromJson(b as Map<String, dynamic>)).toList();
  }

  /// Gets the addresses for a wallet across all networks.
  Future<List<WalletAddress>> getAddresses(String walletId) async {
    final json = await client.get('/v1/wallets/$walletId/addresses');
    final list = json as List? ?? [];
    return list
        .map((a) => WalletAddress.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  /// Deactivates a wallet (soft delete).
  Future<void> deactivate(String walletId) async {
    await client.delete('/v1/wallets/$walletId');
  }

  /// Links an external wallet (e.g., MetaMask) to an Argos wallet.
  Future<ExternalConnection> linkExternal(
    String walletId, {
    required String provider,
    required String address,
    required int chainId,
  }) async {
    final json = await client.post('/v1/wallets/$walletId/connections', {
      'provider': provider,
      'address': address,
      'chain_id': chainId,
    });
    return ExternalConnection.fromJson(json);
  }

  /// Lists all external connections for a wallet.
  Future<List<ExternalConnection>> listConnections(String walletId) async {
    final json = await client.get('/v1/wallets/$walletId/connections');
    final list = json as List? ?? [];
    return list
        .map((c) => ExternalConnection.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  /// Removes an external wallet connection.
  Future<void> unlinkExternal(String walletId, String connectionId) async {
    await client.delete('/v1/wallets/$walletId/connections/$connectionId');
  }
}
