import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface EthereumProvider {
  isMetaMask?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, callback: (...args: unknown[]) => void): void;
  removeListener(event: string, callback: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface ConnectedAccount {
  address: string;
  chainId: number;
  provider: string;
}

@customElement('connect-wallet-button')
export class ConnectWalletButton extends LitElement {
  @property({ type: String }) walletId = '';
  @property({ type: String }) apiUrl = '';
  @property({ type: String }) authToken = '';

  @state() private connected = false;
  @state() private connecting = false;
  @state() private account: ConnectedAccount | null = null;
  @state() private showDropdown = false;
  @state() private linkedAccounts: Array<{ id: string; provider: string; address: string; chainId: number }> = [];
  @state() private error = '';

  static styles = css`
    :host { display: inline-block; }
    .connect-wrapper { position: relative; }
    .connect-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      background: #fff;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: #1a1a2e;
      transition: all 0.2s;
      font-family: inherit;
    }
    .connect-btn:hover { border-color: #f6851b; background: #fef9f0; }
    .connect-btn.connected { border-color: #2e7d32; background: #f0faf0; }
    .connect-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .fox-icon {
      width: 24px;
      height: 24px;
    }
    .fox-icon svg { width: 100%; height: 100%; }
    .short-address {
      font-family: monospace;
      font-size: 13px;
      color: #666;
    }
    .dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      min-width: 320px;
      z-index: 1000;
      overflow: hidden;
    }
    .dropdown-header {
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
      font-weight: 700;
      font-size: 15px;
      color: #1a1a2e;
    }
    .account-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #f5f5f5;
      transition: background 0.15s;
    }
    .account-item:hover { background: #fafafa; }
    .account-item:last-child { border-bottom: none; }
    .account-info { display: flex; flex-direction: column; gap: 2px; }
    .account-provider {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #f6851b;
    }
    .account-address {
      font-family: monospace;
      font-size: 13px;
      color: #444;
    }
    .account-chain {
      font-size: 11px;
      color: #888;
    }
    .unlink-btn {
      padding: 4px 10px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      background: none;
      color: #c62828;
      font-size: 12px;
      cursor: pointer;
    }
    .unlink-btn:hover { background: #ffebee; }
    .connect-new {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 14px 16px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: #1a1a2e;
      transition: background 0.15s;
      font-family: inherit;
    }
    .connect-new:hover { background: #f8f9fa; }
    .error {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: #ffebee;
      color: #c62828;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      white-space: nowrap;
      z-index: 1000;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    this.checkExistingConnection();
    document.addEventListener('click', this.handleOutsideClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleOutsideClick);
  }

  private handleOutsideClick = (e: MouseEvent) => {
    if (!this.shadowRoot?.contains(e.target as Node)) {
      this.showDropdown = false;
    }
  };

  private async checkExistingConnection() {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      }) as string[];

      if (accounts && accounts.length > 0) {
        const chainId = await window.ethereum.request({
          method: 'eth_chainId',
        }) as string;

        this.account = {
          address: accounts[0],
          chainId: parseInt(chainId, 16),
          provider: 'metamask',
        };
        this.connected = true;
      }
    } catch {
      // Not connected
    }
  }

  private shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  private getChainName(chainId: number): string {
    const chains: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      8453: 'Base',
      11155111: 'Sepolia',
      80002: 'Amoy',
      84532: 'Base Sepolia',
    };
    return chains[chainId] ?? `Chain ${chainId}`;
  }

  private async handleConnect() {
    if (!window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    this.connecting = true;
    this.error = '';

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      }) as string;

      const parsedChainId = parseInt(chainId, 16);

      this.account = {
        address: accounts[0],
        chainId: parsedChainId,
        provider: 'metamask',
      };
      this.connected = true;

      if (this.walletId && this.apiUrl) {
        await this.linkToBackend(accounts[0], parsedChainId);
      }

      this.dispatchEvent(
        new CustomEvent('ow-wallet-connected', {
          detail: this.account,
          bubbles: true,
          composed: true,
        }),
      );
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.connecting = false;
    }
  }

  private async linkToBackend(address: string, chainId: number) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      await fetch(`${this.apiUrl}/v1/wallets/${this.walletId}/link-external`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: 'metamask',
          address,
          chainId,
        }),
      });
    } catch {
      // Silently fail — the wallet is still connected locally
    }
  }

  private async handleUnlink(accountId: string) {
    if (this.walletId && this.apiUrl) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      try {
        await fetch(`${this.apiUrl}/v1/wallets/${this.walletId}/unlink-external/${accountId}`, {
          method: 'DELETE',
          headers,
        });
      } catch {
        // Continue with local disconnect
      }
    }

    this.linkedAccounts = this.linkedAccounts.filter((a) => a.id !== accountId);
    this.dispatchEvent(
      new CustomEvent('ow-wallet-unlinked', {
        detail: { connectionId: accountId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <div class="connect-wrapper">
        <button
          class="connect-btn ${this.connected ? 'connected' : ''}"
          ?disabled=${this.connecting}
          @click=${() => {
            if (this.connected) {
              this.showDropdown = !this.showDropdown;
            } else {
              this.handleConnect();
            }
          }}
        >
          <span class="fox-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M30.5 6.5L22 12.5L23.5 8.5L30.5 6.5Z" fill="#E2761B" stroke="#E2761B" stroke-width="0.5"/>
              <path d="M9.5 6.5L17.9 12.6L16.5 8.5L9.5 6.5Z" fill="#E4761B" stroke="#E4761B" stroke-width="0.5"/>
              <path d="M27.3 26.4L25 30L30.1 31.4L31.6 26.5L27.3 26.4Z" fill="#E4761B" stroke="#E4761B" stroke-width="0.5"/>
              <path d="M8.4 26.5L9.9 31.4L15 30L12.7 26.4L8.4 26.5Z" fill="#E4761B" stroke="#E4761B" stroke-width="0.5"/>
              <path d="M14.7 18.7L13.2 21H18.8L18.6 15.3L14.7 18.7Z" fill="#E4761B" stroke="#E4761B" stroke-width="0.5"/>
              <path d="M25.3 18.7L21.3 15.2L21.2 21H26.8L25.3 18.7Z" fill="#E4761B" stroke="#E4761B" stroke-width="0.5"/>
              <path d="M15 30L18.5 28.3L15.5 26.5L15 30Z" fill="#E4761B" stroke="#E4761B" stroke-width="0.5"/>
              <path d="M21.5 28.3L25 30L24.5 26.5L21.5 28.3Z" fill="#E4761B" stroke="#E4761B" stroke-width="0.5"/>
            </svg>
          </span>
          ${this.connecting
            ? 'Connecting...'
            : this.connected && this.account
              ? html`<span class="short-address">${this.shortenAddress(this.account.address)}</span>`
              : 'Connect MetaMask'
          }
        </button>

        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        ${this.showDropdown && this.connected
          ? html`
              <div class="dropdown">
                <div class="dropdown-header">Connected Wallets</div>

                ${this.account
                  ? html`
                      <div class="account-item">
                        <div class="account-info">
                          <span class="account-provider">MetaMask</span>
                          <span class="account-address">${this.shortenAddress(this.account.address)}</span>
                          <span class="account-chain">${this.getChainName(this.account.chainId)}</span>
                        </div>
                      </div>
                    `
                  : ''}

                ${this.linkedAccounts.map(
                  (a) => html`
                    <div class="account-item">
                      <div class="account-info">
                        <span class="account-provider">${a.provider}</span>
                        <span class="account-address">${this.shortenAddress(a.address)}</span>
                        <span class="account-chain">${this.getChainName(a.chainId)}</span>
                      </div>
                      <button class="unlink-btn" @click=${() => this.handleUnlink(a.id)}>Unlink</button>
                    </div>
                  `,
                )}

                <button class="connect-new" @click=${() => { this.showDropdown = false; this.handleConnect(); }}>
                  + Connect another account
                </button>
              </div>
            `
          : ''
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'connect-wallet-button': ConnectWalletButton;
  }
}
