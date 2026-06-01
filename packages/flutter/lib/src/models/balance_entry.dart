class BalanceEntry {
  final String network;
  final String token;
  final String balance;
  final int decimals;

  const BalanceEntry({
    required this.network,
    required this.token,
    required this.balance,
    required this.decimals,
  });

  factory BalanceEntry.fromJson(Map<String, dynamic> json) => BalanceEntry(
        network: json['network'] as String,
        token: json['token'] as String,
        balance: json['balance'] as String,
        decimals: json['decimals'] as int,
      );
}
