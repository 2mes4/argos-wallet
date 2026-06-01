import 'package:flutter/material.dart';
import 'package:argos_wallet/src/models/balance_entry.dart';

class WalletCard extends StatelessWidget {
  final List<BalanceEntry> balances;
  final bool loading;
  final String? error;
  final List<String>? supportedTokens;
  final String? activeNetwork;

  const WalletCard({
    super.key,
    required this.balances,
    this.loading = false,
    this.error,
    this.supportedTokens,
    this.activeNetwork,
  });

  List<BalanceEntry> get _filtered {
    var result = balances;
    if (supportedTokens != null && supportedTokens!.isNotEmpty) {
      final lower = supportedTokens!.map((t) => t.toLowerCase()).toSet();
      result = result.where((b) => lower.contains(b.token.toLowerCase())).toList();
    }
    if (activeNetwork != null) {
      result = result.where((b) => b.network == activeNetwork).toList();
    }
    return result;
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(
        key: Key('wallet-card-loading'),
        child: CircularProgressIndicator(),
      );
    }

    if (error != null) {
      return Text(
        error!,
        key: const Key('wallet-card-error'),
        style: const TextStyle(color: Colors.red),
      );
    }

    final filtered = _filtered;
    if (filtered.isEmpty) {
      return const Text(
        'No balances found',
        key: Key('wallet-card-empty'),
      );
    }

    return Card(
      child: ListView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: filtered.length,
        itemBuilder: (context, index) {
          final entry = filtered[index];
          return ListTile(
            key: Key('balance-${entry.token}-${entry.network}'),
            title: Text(entry.token),
            subtitle: Text(entry.network),
            trailing: Text(entry.balance),
          );
        },
      ),
    );
  }
}
