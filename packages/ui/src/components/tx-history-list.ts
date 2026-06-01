import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface Transaction {
  id: string;
  type: string;
  status: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  network: string;
  createdAt: string;
  txHash?: string;
}

@customElement('tx-history-list')
export class TxHistoryList extends LitElement {
  @property({ type: String }) walletId = '';
  @property({ type: String }) apiUrl = '';
  @property({ type: String }) authToken = '';
  @property({ type: Number }) limit = 20;

  @state() private transactions: Transaction[] = [];
  @state() private loading = false;
  @state() private error = '';

  static styles = css`
    :host {
      display: block;
    }
    .history {
      background: #ffffff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      max-width: 600px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .history-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
    }
    .refresh-btn {
      background: none;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 13px;
      cursor: pointer;
      color: #666;
    }
    .refresh-btn:hover {
      background: #f8f9fa;
    }
    .tx-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .tx-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      background: #f8f9fa;
      border-radius: 10px;
      transition: background 0.2s;
    }
    .tx-row:hover {
      background: #f0f1f3;
    }
    .tx-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .tx-type-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
    }
    .tx-type-icon.deposit { background: #e8f5e9; color: #2e7d32; }
    .tx-type-icon.withdraw { background: #fff3e0; color: #e65100; }
    .tx-type-icon.transfer { background: #e3f2fd; color: #1565c0; }
    .tx-type-icon.contract { background: #f3e5f5; color: #7b1fa2; }
    .tx-details {
      display: flex;
      flex-direction: column;
    }
    .tx-label {
      font-weight: 600;
      font-size: 14px;
      color: #1a1a2e;
    }
    .tx-meta {
      font-size: 12px;
      color: #888;
    }
    .tx-right {
      text-align: right;
    }
    .tx-amount {
      font-weight: 600;
      font-size: 14px;
    }
    .tx-amount.positive { color: #2e7d32; }
    .tx-amount.negative { color: #c62828; }
    .tx-status {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      display: inline-block;
      margin-top: 4px;
    }
    .tx-status.completed { background: #e8f5e9; color: #2e7d32; }
    .tx-status.pending { background: #fff8e1; color: #f57f17; }
    .tx-status.failed { background: #ffebee; color: #c62828; }
    .tx-status.cancelled { background: #f5f5f5; color: #888; }
    .tx-status.initiated { background: #e3f2fd; color: #1565c0; }
    .loading, .empty {
      text-align: center;
      padding: 24px;
      color: #888;
    }
    .error {
      color: #c62828;
      background: #ffebee;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    if (this.walletId && this.apiUrl) {
      await this.fetchTransactions();
    }
  }

  private async fetchTransactions() {
    this.loading = true;
    this.error = '';
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(
        `${this.apiUrl}/v1/wallets/${this.walletId}/transactions?limit=${this.limit}`,
        { headers },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      this.transactions = await response.json();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      FIAT_TO_CRYPTO: 'Deposit',
      CRYPTO_TO_FIAT: 'Withdrawal',
      CRYPTO_TRANSFER: 'Transfer',
      SMART_CONTRACT_CALL: 'Contract Call',
    };
    return labels[type] ?? type;
  }

  private getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      FIAT_TO_CRYPTO: 'deposit',
      CRYPTO_TO_FIAT: 'withdraw',
      CRYPTO_TRANSFER: 'transfer',
      SMART_CONTRACT_CALL: 'contract',
    };
    return classes[type] ?? 'transfer';
  }

  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      FIAT_TO_CRYPTO: '↓',
      CRYPTO_TO_FIAT: '↑',
      CRYPTO_TRANSFER: '→',
      SMART_CONTRACT_CALL: '⚡',
    };
    return icons[type] ?? '?';
  }

  private getStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  render() {
    if (this.loading) {
      return html`<div class="history"><div class="loading">Loading transactions...</div></div>`;
    }

    if (this.error) {
      return html`<div class="history"><div class="error">${this.error}</div></div>`;
    }

    return html`
      <div class="history">
        <div class="history-header">
          <span class="history-title">Transaction History</span>
          <button class="refresh-btn" @click=${this.fetchTransactions}>Refresh</button>
        </div>
        ${this.transactions.length === 0
          ? html`<div class="empty">No transactions yet</div>`
          : html`
              <div class="tx-list">
                ${this.transactions.map(
                  (tx) => html`
                    <div class="tx-row">
                      <div class="tx-left">
                        <div class="tx-type-icon ${this.getTypeClass(tx.type)}">
                          ${this.getTypeIcon(tx.type)}
                        </div>
                        <div class="tx-details">
                          <span class="tx-label">${this.getTypeLabel(tx.type)}</span>
                          <span class="tx-meta">${tx.network} · ${this.formatDate(tx.createdAt)}</span>
                        </div>
                      </div>
                      <div class="tx-right">
                        <div class="tx-amount ${tx.type === 'FIAT_TO_CRYPTO' ? 'positive' : 'negative'}">
                          ${tx.type === 'FIAT_TO_CRYPTO' ? '+' : '-'}${tx.sourceAmount} ${tx.sourceCurrency}
                        </div>
                        <span class="tx-status ${this.getStatusClass(tx.status)}">${tx.status}</span>
                      </div>
                    </div>
                  `,
                )}
              </div>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tx-history-list': TxHistoryList;
  }
}
