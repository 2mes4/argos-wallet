import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('crypto-send-form')
export class CryptoSendForm extends LitElement {
  @property({ type: String }) walletId = '';
  @property({ type: String }) apiUrl = '';
  @property({ type: String }) authToken = '';
  @property({ type: String }) network = 'polygon';
  @property({ type: String }) token = 'USDC';

  @state() private toAddress = '';
  @state() private amount = '';
  @state() private loading = false;
  @state() private error = '';
  @state() private success = false;

  static styles = css`
    :host { display: block; }
    .send-form {
      background: #ffffff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      max-width: 420px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .form-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 20px;
    }
    .field {
      margin-bottom: 16px;
    }
    .field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #666;
      margin-bottom: 6px;
    }
    .field input, .field select {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      box-sizing: border-box;
    }
    .field input:focus, .field select:focus {
      outline: none;
      border-color: #1a1a2e;
    }
    .btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary {
      background: #1a1a2e;
      color: #fff;
    }
    .btn-primary:hover { background: #2d2d4e; }
    .btn-primary:disabled { background: #ccc; cursor: not-allowed; }
    .error {
      color: #c62828;
      background: #ffebee;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .success {
      color: #2e7d32;
      background: #e8f5e9;
      padding: 14px;
      border-radius: 8px;
      font-size: 14px;
      text-align: center;
    }
  `;

  private async handleSubmit() {
    this.loading = true;
    this.error = '';
    this.success = false;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(`${this.apiUrl}/v1/transactions/crypto-transfer`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          walletId: this.walletId,
          network: this.network,
          cryptoSymbol: this.token,
          amount: this.amount,
          toAddress: this.toAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`Transfer failed: ${response.statusText}`);
      }

      this.success = true;
      this.toAddress = '';
      this.amount = '';

      this.dispatchEvent(
        new CustomEvent('ow-transfer-sent', {
          detail: await response.json(),
          bubbles: true,
          composed: true,
        }),
      );
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }

  render() {
    if (this.success) {
      return html`
        <div class="send-form">
          <div class="success">Transfer submitted successfully!</div>
          <button class="btn btn-primary" style="margin-top: 12px;" @click=${() => { this.success = false; }}>
            New Transfer
          </button>
        </div>
      `;
    }

    return html`
      <div class="send-form">
        <div class="form-title">Send ${this.token}</div>
        ${this.error ? html`<div class="error">${this.error}</div>` : ''}
        <div class="field">
          <label>Network</label>
          <select .value=${this.network} @change=${(e: Event) => { this.network = (e.target as HTMLSelectElement).value; }}>
            <option value="polygon">Polygon</option>
            <option value="ethereum">Ethereum</option>
            <option value="base">Base</option>
          </select>
        </div>
        <div class="field">
          <label>Recipient Address</label>
          <input
            type="text"
            .value=${this.toAddress}
            @input=${(e: Event) => { this.toAddress = (e.target as HTMLInputElement).value; }}
            placeholder="0x..."
          />
        </div>
        <div class="field">
          <label>Amount (${this.token})</label>
          <input
            type="number"
            .value=${this.amount}
            @input=${(e: Event) => { this.amount = (e.target as HTMLInputElement).value; }}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
        <button
          class="btn btn-primary"
          ?disabled=${!this.toAddress || !this.amount || parseFloat(this.amount) <= 0 || this.loading}
          @click=${this.handleSubmit}
        >
          ${this.loading ? 'Sending...' : `Send ${this.token}`}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'crypto-send-form': CryptoSendForm;
  }
}
