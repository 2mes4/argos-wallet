class ExternalConnection {
  final String id;
  final String provider;
  final String address;
  final int chainId;
  final DateTime connectedAt;

  const ExternalConnection({
    required this.id,
    required this.provider,
    required this.address,
    required this.chainId,
    required this.connectedAt,
  });

  factory ExternalConnection.fromJson(Map<String, dynamic> json) => ExternalConnection(
        id: json['id'] as String,
        provider: json['provider'] as String,
        address: json['address'] as String,
        chainId: json['chainId'] as int,
        connectedAt: DateTime.parse(json['connectedAt'] as String),
      );
}
