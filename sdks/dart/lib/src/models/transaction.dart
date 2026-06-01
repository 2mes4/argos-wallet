class Transaction {
  final String id;
  final String walletId;
  final String type;
  final String status;
  final String? sourceNetwork;
  final String? sourceToken;
  final String? sourceAmount;
  final String? txHash;
  final String? toAddress;
  final String? error;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Transaction({
    required this.id,
    required this.walletId,
    required this.type,
    required this.status,
    this.sourceNetwork,
    this.sourceToken,
    this.sourceAmount,
    this.txHash,
    this.toAddress,
    this.error,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String,
      walletId: json['wallet_id'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      sourceNetwork: json['source_network'] as String?,
      sourceToken: json['source_token'] as String?,
      sourceAmount: json['source_amount'] as String?,
      txHash: json['tx_hash'] as String?,
      toAddress: json['to_address'] as String?,
      error: json['error'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}
