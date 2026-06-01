class Wallet {
  final String id;
  final String? externalId;
  final String status;
  final Map<String, String> addresses;
  final List<Balance> balances;
  final DateTime createdAt;

  const Wallet({
    required this.id,
    this.externalId,
    required this.status,
    this.addresses = const {},
    this.balances = const [],
    required this.createdAt,
  });

  factory Wallet.fromJson(Map<String, dynamic> json) {
    return Wallet(
      id: json['id'] as String,
      externalId: json['external_id'] as String?,
      status: json['status'] as String,
      addresses: (json['addresses'] as Map<String, dynamic>?)
              ?.map((k, v) => MapEntry(k, v as String)) ??
          {},
      balances: (json['balances'] as List?)
              ?.map((b) => Balance.fromJson(b as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

class Balance {
  final String network;
  final String token;
  final String balance;
  final int decimals;

  const Balance({
    required this.network,
    required this.token,
    required this.balance,
    required this.decimals,
  });

  factory Balance.fromJson(Map<String, dynamic> json) {
    return Balance(
      network: json['network'] as String,
      token: json['token'] as String,
      balance: json['balance'] as String,
      decimals: json['decimals'] as int,
    );
  }
}
