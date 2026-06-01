class TransactionEntry {
  final String id;
  final String type;
  final String status;
  final String sourceCurrency;
  final String targetCurrency;
  final String sourceAmount;
  final String network;
  final DateTime createdAt;
  final String? txHash;

  const TransactionEntry({
    required this.id,
    required this.type,
    required this.status,
    required this.sourceCurrency,
    required this.targetCurrency,
    required this.sourceAmount,
    required this.network,
    required this.createdAt,
    this.txHash,
  });

  factory TransactionEntry.fromJson(Map<String, dynamic> json) => TransactionEntry(
        id: json['id'] as String,
        type: json['type'] as String,
        status: json['status'] as String,
        sourceCurrency: json['sourceCurrency'] as String,
        targetCurrency: json['targetCurrency'] as String,
        sourceAmount: json['sourceAmount'] as String,
        network: json['network'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
        txHash: json['txHash'] as String?,
      );
}
