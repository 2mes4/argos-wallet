import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { WalletContextState } from '../context/types';

@customElement('argos-wallet-provider')
export class ArgosProvider extends LitElement {
  @property({ type: String }) walletId = '';
  @property({ type: String }) apiUrl = '';
  @property({ type: String }) authToken = '';

  @state() private context: WalletContextState = {
    walletId: '',
    apiUrl: '',
    loading: false,
  };

  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a2e;
    }
  `;

  updated(changed: PropertyValues) {
    if (changed.has('walletId') || changed.has('apiUrl') || changed.has('authToken')) {
      this.context = {
        ...this.context,
        walletId: this.walletId,
        apiUrl: this.apiUrl,
        authToken: this.authToken,
      };
      this.dispatchEvent(
        new CustomEvent('ow-context-change', {
          detail: this.context,
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'argos-wallet-provider': ArgosProvider;
  }
}
