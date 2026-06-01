import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('fiat-bridge-wizard')
export class FiatBridgeWizard extends LitElement {
  @property({ type: String }) walletId = '';
  @property({ type: String }) apiUrl = '';
  @property({ type: String }) authToken = '';
  @property({ type: String }) defaultMode: 'on-ramp' | 'off-ramp' = 'on-ramp';

  @state() private mode: 'on-ramp' | 'off-ramp' = 'on-ramp';
  @state() private step = 1;
  @state() private amount = '';
  @state() private selectedToken = 'USDC';
  @state() private selectedNetwork = 'polygon';
  @state() private selectedBank = '';
  @state() private loading = false;
  @state() private error = '';
  @state() private depositInstructions: {
    destinationIban?: string;
    reference: string;
    amount: string;
    currency: string;
    bankName?: string;
    notes?: string;
  } | null = null;

  static styles = css`
    :host {
      display: block;
    }
    .wizard {
      background: #ffffff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      max-width: 420px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .tabs {
      display: flex;
      gap: 0;
      margin-bottom: 24px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #e0e0e0;
    }
    .tab {
      flex: 1;
      padding: 10px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      background: #f8f9fa;
      color: #666;
      transition: all 0.2s;
    }
    .tab.active {
      background: #1a1a2e;
      color: #fff;
    }
    .step-indicator {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    .step-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #e0e0e0;
    }
    .step-dot.active {
      background: #1a1a2e;
    }
    .step-dot.completed {
      background: #2e7d32;
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
      transition: border-color 0.2s;
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
      transition: all 0.2s;
    }
    .btn-primary {
      background: #1a1a2e;
      color: #fff;
    }
    .btn-primary:hover {
      background: #2d2d4e;
    }
    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #f8f9fa;
      color: #666;
      margin-top: 8px;
    }
    .instructions {
      background: #f0f7ff;
      border-radius: 10px;
      padding: 16px;
      margin-top: 16px;
    }
    .instructions h4 {
      margin: 0 0 10px;
      font-size: 14px;
      color: #1a1a2e;
    }
    .instructions p {
      margin: 6px 0;
      font-size: 13px;
      color: #444;
    }
    .instructions .copy-field {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 6px 0;
      font-family: monospace;
      font-size: 13px;
    }
    .error {
      color: #c62828;
      background: #ffebee;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.mode = this.defaultMode;
  }

  private renderStep1() {
    return html`
      <div class="field">
        <label>${this.mode === 'on-ramp' ? 'From' : 'Source Network'}</label>
        ${this.mode === 'on-ramp'
          ? html`<input type="text" value="Bank Account (SEPA)" disabled />`
          : html`
              <select .value=${this.selectedNetwork} @change=${(e: Event) => { this.selectedNetwork = (e.target as HTMLSelectElement).value; }}>
                <option value="polygon">Polygon</option>
                <option value="ethereum">Ethereum</option>
                <option value="base">Base</option>
              </select>
            `}
      </div>
      <div class="field">
        <label>${this.mode === 'on-ramp' ? 'To Network' : 'To'}</label>
        ${this.mode === 'on-ramp'
          ? html`
              <select .value=${this.selectedNetwork} @change=${(e: Event) => { this.selectedNetwork = (e.target as HTMLSelectElement).value; }}>
                <option value="polygon">Polygon</option>
                <option value="ethereum">Ethereum</option>
                <option value="base">Base</option>
              </select>
            `
          : html`<input type="text" value="Bank Account (SEPA)" disabled />`}
      </div>
      <div class="field">
        <label>Token</label>
        <select .value=${this.selectedToken} @change=${(e: Event) => { this.selectedToken = (e.target as HTMLSelectElement).value; }}>
          <option value="USDC">USDC</option>
          <option value="EURC">EURC</option>
        </select>
      </div>
      <button class="btn btn-primary" @click=${() => { this.step = 2; }}>Continue</button>
    `;
  }

  private renderStep2() {
    return html`
      <div class="field">
        <label>Amount (${this.mode === 'on-ramp' ? 'EUR' : this.selectedToken})</label>
        <input
          type="number"
          .value=${this.amount}
          @input=${(e: Event) => { this.amount = (e.target as HTMLInputElement).value; }}
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </div>
      <button class="btn btn-primary" ?disabled=${!this.amount || parseFloat(this.amount) <= 0} @click=${this.handleSubmit}>
        ${this.mode === 'on-ramp' ? 'Get Deposit Instructions' : 'Withdraw to Bank'}
      </button>
      <button class="btn btn-secondary" @click=${() => { this.step = 1; }}>Back</button>
    `;
  }

  private renderStep3() {
    if (!this.depositInstructions) return html``;
    return html`
      <div class="instructions">
        <h4>Deposit Instructions</h4>
        ${this.depositInstructions.destinationIban
          ? html`
              <p><strong>Destination IBAN:</strong></p>
              <div class="copy-field">
                ${this.depositInstructions.destinationIban}
              </div>
            `
          : ''}
        <p><strong>Reference:</strong></p>
        <div class="copy-field">${this.depositInstructions.reference}</div>
        <p><strong>Amount:</strong> ${this.depositInstructions.amount} ${this.depositInstructions.currency}</p>
        ${this.depositInstructions.notes
          ? html`<p style="margin-top: 12px; color: #888;">${this.depositInstructions.notes}</p>`
          : ''}
      </div>
      <button class="btn btn-secondary" style="margin-top: 16px;" @click=${this.reset}>New Transaction</button>
    `;
  }

  private async handleSubmit() {
    this.loading = true;
    this.error = '';

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const endpoint = this.mode === 'on-ramp' ? 'fiat-to-crypto' : 'crypto-to-fiat';
      const body = this.mode === 'on-ramp'
        ? {
            walletId: this.walletId,
            amount: this.amount,
            sourceCurrency: 'EUR',
            targetCrypto: this.selectedToken,
            network: this.selectedNetwork,
          }
        : {
            walletId: this.walletId,
            network: this.selectedNetwork,
            cryptoSymbol: this.selectedToken,
            amount: this.amount,
            targetCurrency: 'EUR',
            targetBankAccountId: this.selectedBank,
          };

      const response = await fetch(`${this.apiUrl}/v1/transactions/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Transaction failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (this.mode === 'on-ramp' && result.depositInstructions) {
        this.depositInstructions = result.depositInstructions;
      }

      this.step = 3;
      this.dispatchEvent(
        new CustomEvent('ow-transaction-created', {
          detail: result,
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

  private reset() {
    this.step = 1;
    this.amount = '';
    this.depositInstructions = null;
    this.error = '';
  }

  render() {
    return html`
      <div class="wizard">
        <div class="tabs">
          <button
            class="tab ${this.mode === 'on-ramp' ? 'active' : ''}"
            @click=${() => { this.mode = 'on-ramp'; this.reset(); }}
          >
            Bank → Crypto
          </button>
          <button
            class="tab ${this.mode === 'off-ramp' ? 'active' : ''}"
            @click=${() => { this.mode = 'off-ramp'; this.reset(); }}
          >
            Crypto → Bank
          </button>
        </div>

        <div class="step-indicator">
          <div class="step-dot ${this.step >= 1 ? 'active' : ''} ${this.step > 1 ? 'completed' : ''}"></div>
          <div class="step-dot ${this.step >= 2 ? 'active' : ''} ${this.step > 2 ? 'completed' : ''}"></div>
          <div class="step-dot ${this.step >= 3 ? 'active' : ''}"></div>
        </div>

        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        ${this.step === 1 ? this.renderStep1() : ''}
        ${this.step === 2 ? this.renderStep2() : ''}
        ${this.step === 3 ? this.renderStep3() : ''}

        ${this.loading ? html`<div style="text-align: center; padding: 12px; color: #888;">Processing...</div>` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fiat-bridge-wizard': FiatBridgeWizard;
  }
}
