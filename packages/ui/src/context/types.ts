export interface WalletContextState {
  walletId: string;
  apiUrl: string;
  authToken?: string;
  activeNetwork?: string;
  activeToken?: string;
  balances?: Array<{
    network: string;
    token: string;
    balance: string;
    decimals: number;
  }>;
  loading?: boolean;
  error?: string;
}

export type ContextEvent = CustomEvent<WalletContextState>;

declare global {
  interface HTMLElementEventMap {
    'ow-context-change': ContextEvent;
  }
}
