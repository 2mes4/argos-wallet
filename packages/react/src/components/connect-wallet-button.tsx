import React, { useState } from 'react';

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface ConnectWalletButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  connected?: boolean;
  address?: string;
}

export function ConnectWalletButton({ onConnect, onDisconnect, connected, address }: ConnectWalletButtonProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setConnecting(true);
    setError('');

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts && accounts.length > 0) {
        onConnect?.(accounts[0]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div data-testid="connect-wallet-wrapper">
      <button
        data-testid="connect-wallet-btn"
        className={`ow-connect-btn ${connected ? 'connected' : ''}`}
        disabled={connecting}
        onClick={connected ? onDisconnect : handleConnect}
      >
        {connecting ? 'Connecting...' : connected ? shortAddress : 'Connect MetaMask'}
      </button>
      {error && <div data-testid="connect-wallet-error" className="ow-error">{error}</div>}
    </div>
  );
}
