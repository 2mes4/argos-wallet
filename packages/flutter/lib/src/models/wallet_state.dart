import 'package:argos_wallet/src/models/balance_entry.dart';

class WalletState {
  final String? walletId;
  final List<BalanceEntry> balances;
  final bool loading;
  final String? error;

  const WalletState({
    this.walletId,
    this.balances = const [],
    this.loading = false,
    this.error,
  });
}
