import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:argos_wallet/argos_wallet.dart';

Widget _wrap(Widget child) {
  return MaterialApp(home: Scaffold(body: child));
}

void main() {
  group('WalletCard', () {
    testWidgets('shows loading indicator', (tester) async {
      await tester.pumpWidget(_wrap(
        const WalletCard(balances: [], loading: true),
      ));
      expect(find.byKey(const Key('wallet-card-loading')), findsOneWidget);
    });

    testWidgets('shows error message', (tester) async {
      await tester.pumpWidget(_wrap(
        const WalletCard(balances: [], error: 'Something went wrong'),
      ));
      expect(find.byKey(const Key('wallet-card-error')), findsOneWidget);
      expect(find.text('Something went wrong'), findsOneWidget);
    });

    testWidgets('shows empty state', (tester) async {
      await tester.pumpWidget(_wrap(
        const WalletCard(balances: []),
      ));
      expect(find.byKey(const Key('wallet-card-empty')), findsOneWidget);
      expect(find.text('No balances found'), findsOneWidget);
    });

    testWidgets('shows balance entries', (tester) async {
      final balances = [
        const BalanceEntry(network: 'ethereum', token: 'ETH', balance: '1.5', decimals: 18),
        const BalanceEntry(network: 'polygon', token: 'MATIC', balance: '100', decimals: 18),
      ];
      await tester.pumpWidget(_wrap(WalletCard(balances: balances)));
      expect(find.byKey(const Key('balance-ETH-ethereum')), findsOneWidget);
      expect(find.byKey(const Key('balance-MATIC-polygon')), findsOneWidget);
    });

    testWidgets('filters by supportedTokens', (tester) async {
      final balances = [
        const BalanceEntry(network: 'ethereum', token: 'ETH', balance: '1.5', decimals: 18),
        const BalanceEntry(network: 'ethereum', token: 'USDC', balance: '1000', decimals: 6),
      ];
      await tester.pumpWidget(_wrap(
        WalletCard(balances: balances, supportedTokens: ['eth']),
      ));
      expect(find.byKey(const Key('balance-ETH-ethereum')), findsOneWidget);
      expect(find.byKey(const Key('balance-USDC-ethereum')), findsNothing);
    });

    testWidgets('filters by activeNetwork', (tester) async {
      final balances = [
        const BalanceEntry(network: 'ethereum', token: 'ETH', balance: '1.5', decimals: 18),
        const BalanceEntry(network: 'polygon', token: 'ETH', balance: '2.0', decimals: 18),
      ];
      await tester.pumpWidget(_wrap(
        WalletCard(balances: balances, activeNetwork: 'polygon'),
      ));
      expect(find.byKey(const Key('balance-ETH-ethereum')), findsNothing);
      expect(find.byKey(const Key('balance-ETH-polygon')), findsOneWidget);
    });
  });

  group('ConnectWalletButton', () {
    testWidgets('shows connect text when not connected', (tester) async {
      await tester.pumpWidget(_wrap(
        const ConnectWalletButton(),
      ));
      expect(find.byKey(const Key('connect-wallet-btn')), findsOneWidget);
      expect(find.text('Connect MetaMask'), findsOneWidget);
    });

    testWidgets('shows truncated address when connected', (tester) async {
      await tester.pumpWidget(_wrap(
        const ConnectWalletButton(
          connected: true,
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        ),
      ));
      expect(find.text('0x742d...bD18'), findsOneWidget);
    });

    testWidgets('calls onConnect when not connected', (tester) async {
      var called = false;
      await tester.pumpWidget(_wrap(
        ConnectWalletButton(onConnect: () => called = true),
      ));
      await tester.tap(find.byKey(const Key('connect-wallet-btn')));
      expect(called, true);
    });

    testWidgets('calls onDisconnect when connected', (tester) async {
      var called = false;
      await tester.pumpWidget(_wrap(
        ConnectWalletButton(
          connected: true,
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
          onDisconnect: () => called = true,
        ),
      ));
      await tester.tap(find.byKey(const Key('connect-wallet-btn')));
      expect(called, true);
    });
  });

  group('TransactionList', () {
    testWidgets('shows loading indicator', (tester) async {
      await tester.pumpWidget(_wrap(
        const TransactionList(transactions: [], loading: true),
      ));
      expect(find.byKey(const Key('tx-list-loading')), findsOneWidget);
    });

    testWidgets('shows empty state', (tester) async {
      await tester.pumpWidget(_wrap(
        const TransactionList(transactions: []),
      ));
      expect(find.byKey(const Key('tx-list-empty')), findsOneWidget);
      expect(find.text('No transactions yet'), findsOneWidget);
    });

    testWidgets('shows transactions with correct labels', (tester) async {
      final transactions = [
        TransactionEntry(
          id: 'tx-1',
          type: 'FIAT_TO_CRYPTO',
          status: 'COMPLETED',
          sourceCurrency: 'USD',
          targetCurrency: 'BTC',
          sourceAmount: '100',
          network: 'bitcoin',
          createdAt: DateTime(2025),
        ),
        TransactionEntry(
          id: 'tx-2',
          type: 'CRYPTO_TO_FIAT',
          status: 'COMPLETED',
          sourceCurrency: 'ETH',
          targetCurrency: 'USD',
          sourceAmount: '0.5',
          network: 'ethereum',
          createdAt: DateTime(2025),
        ),
        TransactionEntry(
          id: 'tx-3',
          type: 'CRYPTO_TRANSFER',
          status: 'COMPLETED',
          sourceCurrency: 'ETH',
          targetCurrency: 'ETH',
          sourceAmount: '1.0',
          network: 'ethereum',
          createdAt: DateTime(2025),
        ),
      ];
      await tester.pumpWidget(_wrap(TransactionList(transactions: transactions)));
      expect(find.byKey(const Key('tx-tx-1')), findsOneWidget);
      expect(find.text('Deposit'), findsOneWidget);
      expect(find.text('-0.5'), findsOneWidget);
      expect(find.text('Withdrawal'), findsOneWidget);
      expect(find.text('+100'), findsOneWidget);
      expect(find.text('Transfer'), findsOneWidget);
      expect(find.text('-1.0'), findsOneWidget);
    });
  });
}
