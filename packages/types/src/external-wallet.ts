export interface ExternalWalletAccount {
  address: string;
  chainId: number;
  provider: string;
  balance?: string;
}

export interface ExternalWalletConnection {
  id: string;
  walletId: string;
  provider: ExternalWalletProviderType;
  address: string;
  chainId: number;
  connectedAt: Date;
  metadata: Record<string, unknown>;
}

export type ExternalWalletProviderType = 'metamask' | 'walletconnect' | 'coinbase' | 'phantom' | 'trust';

export interface IExternalWalletConnector {
  readonly providerType: ExternalWalletProviderType;
  readonly isAvailable: boolean;

  connect(chainId?: number): Promise<ExternalWalletAccount>;
  disconnect(): Promise<void>;
  getAccount(): Promise<ExternalWalletAccount | null>;
  signMessage(message: string): Promise<string>;
  switchChain(chainId: number): Promise<void>;
  onAccountsChanged(callback: (accounts: string[]) => void): () => void;
  onChainChanged(callback: (chainId: number) => void): () => void;
}

export interface StoredExternalConnection {
  id: string;
  walletId: string;
  provider: ExternalWalletProviderType;
  address: string;
  chainId: number;
  metadata: Record<string, unknown>;
  connectedAt: Date;
}
