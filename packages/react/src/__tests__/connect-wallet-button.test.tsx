import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConnectWalletButton } from '../components/connect-wallet-button';

describe('ConnectWalletButton', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'ethereum', {
      writable: true,
      value: undefined,
    });
  });

  it('should render connect button when not connected', () => {
    render(React.createElement(ConnectWalletButton, {}));
    expect(screen.getByTestId('connect-wallet-btn')).toHaveTextContent('Connect MetaMask');
  });

  it('should show short address when connected', () => {
    render(React.createElement(ConnectWalletButton, {
      connected: true,
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    }));
    expect(screen.getByTestId('connect-wallet-btn')).toHaveTextContent('0x742d...bD18');
  });

  it('should call onDisconnect when clicked while connected', () => {
    const onDisconnect = jest.fn();
    render(React.createElement(ConnectWalletButton, {
      connected: true,
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
      onDisconnect,
    }));
    fireEvent.click(screen.getByTestId('connect-wallet-btn'));
    expect(onDisconnect).toHaveBeenCalled();
  });

  it('should call onConnect with address when MetaMask connects', async () => {
    const onConnect = jest.fn();
    (window as any).ethereum = {
      request: jest.fn().mockResolvedValue(['0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B']),
    };

    render(React.createElement(ConnectWalletButton, { onConnect }));
    fireEvent.click(screen.getByTestId('connect-wallet-btn'));

    await waitFor(() => {
      expect(onConnect).toHaveBeenCalledWith('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B');
    });
  });

  it('should show error when MetaMask request fails', async () => {
    (window as any).ethereum = {
      request: jest.fn().mockRejectedValue(new Error('User rejected')),
    };

    render(React.createElement(ConnectWalletButton, {}));
    fireEvent.click(screen.getByTestId('connect-wallet-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('connect-wallet-error')).toHaveTextContent('User rejected');
    });
  });

  it('should show connecting state while waiting', async () => {
    let resolveRequest: (value: any) => void;
    (window as any).ethereum = {
      request: jest.fn().mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; })),
    };

    render(React.createElement(ConnectWalletButton, {}));
    fireEvent.click(screen.getByTestId('connect-wallet-btn'));

    expect(screen.getByTestId('connect-wallet-btn')).toHaveTextContent('Connecting...');

    resolveRequest!(['0xabc']);
    await waitFor(() => {
      expect(screen.getByTestId('connect-wallet-btn')).not.toHaveTextContent('Connecting...');
    });
  });
});
