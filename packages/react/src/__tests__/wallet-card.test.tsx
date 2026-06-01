import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WalletCard } from '../components/wallet-card';

describe('WalletCard', () => {
  const mockBalances = [
    { network: 'polygon', token: 'USDC', balance: '100.50', decimals: 6 },
    { network: 'polygon', token: 'POL', balance: '5.25', decimals: 18 },
    { network: 'base', token: 'ETH', balance: '0.5', decimals: 18 },
  ];

  it('should render all balances', () => {
    render(React.createElement(WalletCard, { balances: mockBalances }));
    expect(screen.getByTestId('wallet-card')).toBeTruthy();
    expect(screen.getByTestId('balance-USDC-polygon')).toHaveTextContent('100.50');
    expect(screen.getByTestId('balance-POL-polygon')).toHaveTextContent('5.25');
    expect(screen.getByTestId('balance-ETH-base')).toHaveTextContent('0.50');
  });

  it('should show loading state', () => {
    render(React.createElement(WalletCard, { balances: [], loading: true }));
    expect(screen.getByTestId('wallet-card-loading')).toHaveTextContent('Loading');
  });

  it('should show error state', () => {
    render(React.createElement(WalletCard, { balances: [], error: 'Network error' }));
    expect(screen.getByTestId('wallet-card-error')).toHaveTextContent('Network error');
  });

  it('should show empty state when no balances', () => {
    render(React.createElement(WalletCard, { balances: [] }));
    expect(screen.getByTestId('wallet-card-empty')).toHaveTextContent('No balances');
  });

  it('should filter by supportedTokens', () => {
    render(React.createElement(WalletCard, { balances: mockBalances, supportedTokens: ['USDC'] }));
    expect(screen.getByTestId('wallet-card')).toBeTruthy();
    expect(screen.queryByTestId('balance-POL-polygon')).toBeNull();
    expect(screen.queryByTestId('balance-ETH-base')).toBeNull();
    expect(screen.getByTestId('balance-USDC-polygon')).toBeTruthy();
  });

  it('should filter by activeNetwork', () => {
    render(React.createElement(WalletCard, { balances: mockBalances, activeNetwork: 'polygon' }));
    expect(screen.getByTestId('balance-USDC-polygon')).toBeTruthy();
    expect(screen.getByTestId('balance-POL-polygon')).toBeTruthy();
    expect(screen.queryByTestId('balance-ETH-base')).toBeNull();
  });
});
