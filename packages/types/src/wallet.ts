export interface MultiChainWallet {
  walletId: string;
  addresses: Record<string, string>;
  createdAt: Date;
}

export interface WalletBalance {
  network: string;
  token: string;
  balance: string;
  balanceUSD?: string;
  decimals: number;
}

export interface WalletInfo {
  walletId: string;
  addresses: Record<string, string>;
  balances: WalletBalance[];
  linkedBanks: import('./fiat').BankAccountDetails[];
  createdAt: Date;
}

export interface IWalletEngine {
  createWallet(): Promise<MultiChainWallet>;

  getWallet(walletId: string): Promise<WalletInfo>;

  getBalance(walletId: string, network: string, token: string): Promise<string>;

  getAllBalances(walletId: string): Promise<WalletBalance[]>;

  signMessage(walletId: string, network: string, message: string): Promise<string>;

  destroy(): Promise<void>;
}
