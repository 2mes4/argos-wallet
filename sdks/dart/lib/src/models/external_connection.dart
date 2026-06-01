class ExternalConnection {
  final String id;
  final String walletId;
  final String provider;
  final String address;
  final int chainId;
  final DateTime connectedAt;

  const ExternalConnection({
    required this.id,
    required this.walletId,
    required this.provider,
    required this.address,
    required this.chainId,
    required this.connectedAt,
  });

  factory ExternalConnection.fromJson(Map<String, dynamic> json) {
    return ExternalConnection(
      id: json['id'] as String,
      walletId: json['wallet_id'] as String,
      provider: json['provider'] as String,
      address: json['address'] as String,
      chainId: json['chain_id'] as int,
      connectedAt: DateTime.parse(json['connected_at'] as String),
    );
  }
}
