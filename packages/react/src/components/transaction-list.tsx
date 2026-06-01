import React from 'react';

interface TransactionEntry {
  id: string;
  type: string;
  status: string;
  sourceCurrency: string;
  sourceAmount: string;
  network: string;
  createdAt: string;
}

interface TransactionListProps {
  transactions: TransactionEntry[];
  loading?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  FIAT_TO_CRYPTO: 'Deposit',
  CRYPTO_TO_FIAT: 'Withdrawal',
  CRYPTO_TRANSFER: 'Transfer',
  SMART_CONTRACT_CALL: 'Contract Call',
};

const TYPE_ICONS: Record<string, string> = {
  FIAT_TO_CRYPTO: '↓',
  CRYPTO_TO_FIAT: '↑',
  CRYPTO_TRANSFER: '→',
  SMART_CONTRACT_CALL: '⚡',
};

export function TransactionList({ transactions, loading }: TransactionListProps) {
  if (loading) {
    return <div data-testid="tx-list-loading" className="ow-tx-list">Loading transactions...</div>;
  }

  if (transactions.length === 0) {
    return <div data-testid="tx-list-empty" className="ow-tx-list">No transactions yet</div>;
  }

  return (
    <div data-testid="tx-list" className="ow-tx-list">
      <div className="ow-tx-header">
        <span className="ow-tx-title">Transaction History</span>
      </div>
      {transactions.map((tx) => (
        <div key={tx.id} className="ow-tx-row" data-testid={`tx-${tx.id}`}>
          <div className="ow-tx-left">
            <span className="ow-tx-type-icon">{TYPE_ICONS[tx.type] ?? '?'}</span>
            <div>
              <div className="ow-tx-label">{TYPE_LABELS[tx.type] ?? tx.type}</div>
              <div className="ow-tx-meta">{`${tx.network} · ${new Date(tx.createdAt).toLocaleDateString()}`}</div>
            </div>
          </div>
          <div className="ow-tx-right">
            <div className={`ow-tx-amount ${tx.type === 'FIAT_TO_CRYPTO' ? 'positive' : 'negative'}`}>
              {`${tx.type === 'FIAT_TO_CRYPTO' ? '+' : '-'}${tx.sourceAmount} ${tx.sourceCurrency}`}
            </div>
            <span className={`ow-tx-status ${tx.status.toLowerCase()}`}>{tx.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
