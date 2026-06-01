export interface WalletApiConfig {
  apiUrl: string;
  authToken?: string;
}

export interface WalletState {
  walletId: string | null;
  balances: BalanceEntry[];
  loading: boolean;
  error: string | null;
}

export interface BalanceEntry {
  network: string;
  token: string;
  balance: string;
  decimals: number;
}

export interface TransactionEntry {
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

export interface ExternalConnection {
  id: string;
  provider: string;
  address: string;
  chainId: number;
  connectedAt: string;
}
