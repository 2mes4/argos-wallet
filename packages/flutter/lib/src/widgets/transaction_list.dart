import 'package:flutter/material.dart';
import 'package:argos_wallet/src/models/transaction_entry.dart';

class TransactionList extends StatelessWidget {
  final List<TransactionEntry> transactions;
  final bool loading;

  const TransactionList({
    super.key,
    required this.transactions,
    this.loading = false,
  });

  String _typeLabel(String type) {
    switch (type) {
      case 'FIAT_TO_CRYPTO':
        return 'Deposit';
      case 'CRYPTO_TO_FIAT':
        return 'Withdrawal';
      case 'CRYPTO_TRANSFER':
        return 'Transfer';
      case 'SMART_CONTRACT_CALL':
        return 'Contract Call';
      default:
        return type;
    }
  }

  String _amountPrefix(String type) {
    switch (type) {
      case 'FIAT_TO_CRYPTO':
        return '+';
      case 'CRYPTO_TO_FIAT':
        return '-';
      case 'CRYPTO_TRANSFER':
        return '-';
      default:
        return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(
        key: Key('tx-list-loading'),
        child: CircularProgressIndicator(),
      );
    }

    if (transactions.isEmpty) {
      return const Text(
        'No transactions yet',
        key: Key('tx-list-empty'),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: transactions.length,
      itemBuilder: (context, index) {
        final tx = transactions[index];
        return ListTile(
          key: Key('tx-${tx.id}'),
          title: Text(_typeLabel(tx.type)),
          subtitle: Text(tx.sourceCurrency),
          trailing: Text('${_amountPrefix(tx.type)}${tx.sourceAmount}'),
        );
      },
    );
  }
}
