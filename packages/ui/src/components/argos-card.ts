import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface BalanceEntry {
  network: string;
  token: string;
  balance: string;
  decimals: number;
}

@customElement('argos-wallet-card')
export class ArgosCard extends LitElement {
  @property({ type: String }) walletId = '';
  @property({ type: String }) apiUrl = '';
  @property({ type: String }) authToken = '';
  @property({ type: String }) supportedTokens = 'USDC,EURC';
  @property({ type: String }) activeNetwork = '';

  @state() private balances: BalanceEntry[] = [];
  @state() private loading = false;
  @state() private error = '';

  static styles = css`
    :host {
      display: block;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      max-width: 420px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
    }
    .network-badge {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 20px;
      background: #e8f5e9;
      color: #2e7d32;
      font-weight: 600;
      text-transform: uppercase;
    }
    .balance-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .balance-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f8f9fa;
      border-radius: 10px;
      transition: background 0.2s;
    }
    .balance-row:hover {
      background: #f0f1f3;
    }
    .token-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .token-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
    }
    .token-icon.usdc { background: #2775ca; }
    .token-icon.eurc { background: #2e7d32; }
    .token-icon.eth { background: #627eea; }
    .token-icon.pol { background: #8247e5; }
    .token-icon.usdt { background: #26a17b; }
    .token-icon.default { background: #666; }
    .token-symbol {
      font-weight: 600;
      color: #1a1a2e;
    }
    .token-network {
      font-size: 11px;
      color: #888;
    }
    .token-balance {
      font-size: 16px;
      font-weight: 700;
      color: #1a1a2e;
      font-variant-numeric: tabular-nums;
    }
    .loading {
      text-align: center;
      padding: 20px;
      color: #888;
    }
    .error {
      text-align: center;
      padding: 16px;
      color: #c62828;
      background: #ffebee;
      border-radius: 8px;
      font-size: 14px;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    if (this.walletId && this.apiUrl) {
      await this.fetchBalances();
    }
  }

  private async fetchBalances() {
    this.loading = true;
    this.error = '';
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(`${this.apiUrl}/v1/wallets/${this.walletId}/balances`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch balances: ${response.statusText}`);
      }

      this.balances = await response.json();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private getTokenClass(symbol: string): string {
    const s = symbol.toLowerCase();
    if (['usdc', 'eurc', 'eth', 'pol', 'usdt'].includes(s)) return s;
    return 'default';
  }

  render() {
    if (this.loading) {
      return html`<div class="card"><div class="loading">Loading balances...</div></div>`;
    }

    if (this.error) {
      return html`<div class="card"><div class="error">${this.error}</div></div>`;
    }

    const filtered = this.activeNetwork
      ? this.balances.filter((b) => b.network === this.activeNetwork)
      : this.balances;

    const tokens = this.supportedTokens.split(',').map((t) => t.trim().toUpperCase());
    const displayed = filtered.filter((b) => tokens.includes(b.token.toUpperCase()));

    return html`
      <div class="card">
        <div class="card-header">
          <span class="card-title">Wallet Balance</span>
          ${this.activeNetwork
            ? html`<span class="network-badge">${this.activeNetwork}</span>`
            : ''}
        </div>
        <div class="balance-list">
          ${displayed.length === 0
            ? html`<div class="loading">No balances found</div>`
            : displayed.map(
                (b) => html`
                  <div class="balance-row">
                    <div class="token-info">
                      <div class="token-icon ${this.getTokenClass(b.token)}">
                        ${b.token.slice(0, 2)}
                      </div>
                      <div>
                        <div class="token-symbol">${b.token}</div>
                        <div class="token-network">${b.network}</div>
                      </div>
                    </div>
                    <div class="token-balance">${parseFloat(b.balance).toFixed(b.decimals > 2 ? 2 : b.decimals)}</div>
                  </div>
                `,
              )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'argos-wallet-card': ArgosCard;
  }
}
