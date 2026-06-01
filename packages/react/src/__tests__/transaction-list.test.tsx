import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TransactionList } from '../components/transaction-list';

describe('TransactionList', () => {
  const mockTransactions = [
    {
      id: 'tx-1',
      type: 'FIAT_TO_CRYPTO',
      status: 'COMPLETED',
      sourceCurrency: 'EUR',
      targetCurrency: 'USDC',
      sourceAmount: '100',
      network: 'polygon',
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'tx-2',
      type: 'CRYPTO_TRANSFER',
      status: 'PENDING',
      sourceCurrency: 'USDC',
      targetCurrency: 'USDC',
      sourceAmount: '25',
      network: 'polygon',
      createdAt: '2024-01-16T12:00:00Z',
    },
    {
      id: 'tx-3',
      type: 'SMART_CONTRACT_CALL',
      status: 'FAILED',
      sourceCurrency: 'NATIVE',
      targetCurrency: 'NATIVE',
      sourceAmount: '0',
      network: 'base',
      createdAt: '2024-01-17T14:00:00Z',
    },
  ];

  it('should render all transactions', () => {
    render(React.createElement(TransactionList, { transactions: mockTransactions }));
    expect(screen.getByTestId('tx-list')).toBeTruthy();
    expect(screen.getByTestId('tx-tx-1')).toBeTruthy();
    expect(screen.getByTestId('tx-tx-2')).toBeTruthy();
    expect(screen.getByTestId('tx-tx-3')).toBeTruthy();
  });

  it('should display correct type labels', () => {
    render(React.createElement(TransactionList, { transactions: mockTransactions }));
    expect(screen.getByTestId('tx-tx-1')).toHaveTextContent('Deposit');
    expect(screen.getByTestId('tx-tx-2')).toHaveTextContent('Transfer');
    expect(screen.getByTestId('tx-tx-3')).toHaveTextContent('Contract Call');
  });

  it('should show positive amount for deposits', () => {
    render(React.createElement(TransactionList, { transactions: mockTransactions }));
    expect(screen.getByTestId('tx-tx-1')).toHaveTextContent('+100 EUR');
  });

  it('should show negative amount for transfers', () => {
    render(React.createElement(TransactionList, { transactions: mockTransactions }));
    expect(screen.getByTestId('tx-tx-2')).toHaveTextContent('-25 USDC');
  });

  it('should show status badges', () => {
    render(React.createElement(TransactionList, { transactions: mockTransactions }));
    expect(screen.getByTestId('tx-tx-1')).toHaveTextContent('COMPLETED');
    expect(screen.getByTestId('tx-tx-2')).toHaveTextContent('PENDING');
    expect(screen.getByTestId('tx-tx-3')).toHaveTextContent('FAILED');
  });

  it('should show loading state', () => {
    render(React.createElement(TransactionList, { transactions: [], loading: true }));
    expect(screen.getByTestId('tx-list-loading')).toBeTruthy();
  });

  it('should show empty state', () => {
    render(React.createElement(TransactionList, { transactions: [] }));
    expect(screen.getByTestId('tx-list-empty')).toHaveTextContent('No transactions yet');
  });
});
