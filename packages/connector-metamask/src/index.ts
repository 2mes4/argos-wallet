import type {
  IExternalWalletConnector,
  ExternalWalletAccount,
  ExternalWalletProviderType,
} from '@argos-wallet/types';

interface EthereumProvider {
  isMetaMask?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, callback: (...args: unknown[]) => void): void;
  removeListener(event: string, callback: (...args: unknown[]) => void): void;
  selectedAddress?: string;
  chainId?: string;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const CHAIN_IDS: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon',
  8453: 'base',
  11155111: 'ethereum-sepolia',
  80002: 'polygon-amoy',
  84532: 'base-sepolia',
};

export class MetaMaskConnector implements IExternalWalletConnector {
  readonly providerType: ExternalWalletProviderType = 'metamask';

  private provider: EthereumProvider | null = null;
  private accountListeners = new Set<(accounts: string[]) => void>();
  private chainListeners = new Set<(chainId: number) => void>();

  get isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
  }

  private getProvider(): EthereumProvider {
    if (this.provider) return this.provider;

    if (!window.ethereum) {
      throw new Error(
        'No Ethereum provider found. Please install MetaMask: https://metamask.io/download/'
      );
    }

    this.provider = window.ethereum;
    return this.provider;
  }

  async connect(chainId?: number): Promise<ExternalWalletAccount> {
    const provider = this.getProvider();

    if (chainId) {
      await this.switchChain(chainId);
    }

    const accounts = await provider.request({
      method: 'eth_requestAccounts',
    }) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned from MetaMask');
    }

    const address = accounts[0];
    const currentChainId = await this.getCurrentChainId();

    const balance = await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    }) as string;

    this.setupEventListeners();

    return {
      address,
      chainId: currentChainId,
      provider: 'metamask',
      balance: balance,
    };
  }

  async disconnect(): Promise<void> {
    this.removeEventListeners();
    this.accountListeners.clear();
    this.chainListeners.clear();
    this.provider = null;
  }

  async getAccount(): Promise<ExternalWalletAccount | null> {
    const provider = this.getProvider();
    const accounts = await provider.request({
      method: 'eth_accounts',
    }) as string[];

    if (!accounts || accounts.length === 0) {
      return null;
    }

    const chainId = await this.getCurrentChainId();

    return {
      address: accounts[0],
      chainId,
      provider: 'metamask',
    };
  }

  async signMessage(message: string): Promise<string> {
    const provider = this.getProvider();
    const accounts = await provider.request({
      method: 'eth_accounts',
    }) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error('No account connected');
    }

    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, accounts[0]],
    }) as string;

    return signature;
  }

  async switchChain(chainId: number): Promise<void> {
    const provider = this.getProvider();
    const hexChainId = `0x${chainId.toString(16)}`;

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: unknown) {
      const err = switchError as { code: number };
      if (err.code === 4902) {
        throw new Error(
          `Chain ${chainId} (${CHAIN_IDS[chainId] ?? 'unknown'}) is not available in MetaMask. Add it first.`
        );
      }
      throw switchError;
    }
  }

  onAccountsChanged(callback: (accounts: string[]) => void): () => void {
    this.accountListeners.add(callback);
    return () => {
      this.accountListeners.delete(callback);
    };
  }

  onChainChanged(callback: (chainId: number) => void): () => void {
    this.chainListeners.add(callback);
    return () => {
      this.chainListeners.delete(callback);
    };
  }

  private async getCurrentChainId(): Promise<number> {
    const provider = this.getProvider();
    const chainId = await provider.request({
      method: 'eth_chainId',
    }) as string;
    return parseInt(chainId, 16);
  }

  private setupEventListeners(): void {
    const provider = this.getProvider();

    provider.on('accountsChanged', (accounts: unknown) => {
      const typed = accounts as string[];
      for (const cb of this.accountListeners) {
        cb(typed);
      }
    });

    provider.on('chainChanged', (chainId: unknown) => {
      const typed = typeof chainId === 'string' ? parseInt(chainId, 16) : Number(chainId);
      for (const cb of this.chainListeners) {
        cb(typed);
      }
    });
  }

  private removeEventListeners(): void {
    if (!this.provider) return;
    this.provider.removeListener('accountsChanged', () => {});
    this.provider.removeListener('chainChanged', () => {});
  }
}
