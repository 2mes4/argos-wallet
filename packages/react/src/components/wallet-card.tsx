import React from 'react';

interface BalanceEntry {
  network: string;
  token: string;
  balance: string;
  decimals: number;
}

interface WalletCardProps {
  balances: BalanceEntry[];
  loading?: boolean;
  error?: string | null;
  supportedTokens?: string[];
  activeNetwork?: string;
}

const TOKEN_COLORS: Record<string, string> = {
  USDC: '#2775ca', EURC: '#2e7d32', ETH: '#627eea', POL: '#8247e5', USDT: '#26a17b',
};

export function WalletCard({ balances, loading, error, supportedTokens, activeNetwork }: WalletCardProps) {
  if (loading) return <div data-testid="wallet-card-loading" className="ow-card">Loading balances...</div>;
  if (error) return <div data-testid="wallet-card-error" className="ow-card ow-card-error">{error}</div>;

  const tokens = supportedTokens?.map((t) => t.toUpperCase()) ?? null;
  const filtered = balances
    .filter((b) => !tokens || tokens.includes(b.token.toUpperCase()))
    .filter((b) => !activeNetwork || b.network === activeNetwork);

  if (filtered.length === 0) return <div data-testid="wallet-card-empty" className="ow-card">No balances found</div>;

  return (
    <div data-testid="wallet-card" className="ow-card">
      <div className="ow-card-header">
        <span className="ow-card-title">Wallet Balance</span>
        {activeNetwork && <span className="ow-network-badge">{activeNetwork}</span>}
      </div>
      <div className="ow-balance-list">
        {filtered.map((b, i) => (
          <div key={i} className="ow-balance-row" data-testid={`balance-${b.token}-${b.network}`}>
            <div className="ow-token-info">
              <div className={`ow-token-icon ${b.token.toLowerCase()}`} style={{ background: TOKEN_COLORS[b.token] ?? '#666' }}>
                {b.token.slice(0, 2)}
              </div>
              <div>
                <div className="ow-token-symbol">{b.token}</div>
                <div className="ow-token-network">{b.network}</div>
              </div>
            </div>
            <div className="ow-token-balance">{parseFloat(b.balance).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
