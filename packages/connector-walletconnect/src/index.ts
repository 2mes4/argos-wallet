import type {
  IExternalWalletConnector,
  ExternalWalletAccount,
  ExternalWalletProviderType,
} from '@argos-wallet/types';

export interface WalletConnectConfig {
  projectId: string;
  chains: number[];
  optionalChains?: number[];
  metadata?: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  showQrModal?: boolean;
}

const CHAIN_RPC: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  137: 'https://polygon-rpc.com',
  8453: 'https://mainnet.base.org',
  11155111: 'https://rpc.sepolia.org',
  80002: 'https://rpc-amoy.polygon.technology',
  84532: 'https://sepolia.base.org',
};

export class WalletConnectConnector implements IExternalWalletConnector {
  readonly providerType: ExternalWalletProviderType = 'walletconnect';

  private config: WalletConnectConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private provider: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private session: any = null;
  private initialized = false;
  private accountListeners = new Set<(accounts: string[]) => void>();
  private chainListeners = new Set<(chainId: number) => void>();

  constructor(config: WalletConnectConfig) {
    this.config = config;
  }

  get isAvailable(): boolean {
    return typeof window !== 'undefined';
  }

  private async ensureInit(): Promise<void> {
    if (this.initialized && this.provider) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let EthereumProvider: any;
    try {
      // Dynamic import — @walletconnect/ethereum-provider is a peer dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const wc = await (Function('return import("@walletconnect/ethereum-provider")')() as Promise<{ EthereumProvider: unknown }>);
      EthereumProvider = wc.EthereumProvider;
    } catch {
      throw new Error(
        'WalletConnect not installed. Run: npm install @walletconnect/ethereum-provider @walletconnect/modal'
      );
    }

    const rpcMap = Object.fromEntries(
      this.config.chains.map((id) => [id, CHAIN_RPC[id] ?? 'https://rpc.ankr.com/eth']),
    );

    this.provider = await EthereumProvider.init({
      projectId: this.config.projectId,
      optionalChains: this.config.optionalChains,
      chains: this.config.chains,
      showQrModal: this.config.showQrModal ?? true,
      metadata: this.config.metadata ?? {
        name: 'Argos Wallet App',
        description: 'Powered by Argos Wallet SDK',
        url: 'https://argos-wallet.dev',
        icons: ['https://argos-wallet.dev/icon.png'],
      },
      rpcMap,
      methods: ['eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData'],
      events: ['chainChanged', 'accountsChanged'],
    });

    this.setupListeners();
    this.initialized = true;
  }

  async connect(chainId?: number): Promise<ExternalWalletAccount> {
    await this.ensureInit();

    const targetChain = chainId ?? this.config.chains[0];

    try {
      this.session = await this.provider.connect({ chains: [targetChain] });
    } catch {
      throw new Error('WalletConnect connection rejected or timed out');
    }

    const accounts = (await this.provider.request({
      method: 'eth_accounts',
    })) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned from WalletConnect');
    }

    const currentChainId = await this.getCurrentChainId();

    return {
      address: accounts[0],
      chainId: currentChainId,
      provider: 'walletconnect',
    };
  }

  async disconnect(): Promise<void> {
    if (this.provider) {
      try { await this.provider.disconnect(); } catch { /* ignore */ }
    }
    this.session = null;
    this.accountListeners.clear();
    this.chainListeners.clear();
  }

  async getAccount(): Promise<ExternalWalletAccount | null> {
    await this.ensureInit();
    if (!this.session) return null;

    try {
      const accounts = (await this.provider.request({
        method: 'eth_accounts',
      })) as string[];

      if (!accounts || accounts.length === 0) return null;

      return {
        address: accounts[0],
        chainId: await this.getCurrentChainId(),
        provider: 'walletconnect',
      };
    } catch {
      return null;
    }
  }

  async signMessage(message: string): Promise<string> {
    await this.ensureInit();

    const accounts = (await this.provider.request({
      method: 'eth_accounts',
    })) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error('No WalletConnect account connected');
    }

    return (await this.provider.request({
      method: 'personal_sign',
      params: [message, accounts[0]],
    })) as string;
  }

  async switchChain(chainId: number): Promise<void> {
    await this.ensureInit();
    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch {
      throw new Error(`Failed to switch to chain ${chainId} via WalletConnect`);
    }
  }

  onAccountsChanged(callback: (accounts: string[]) => void): () => void {
    this.accountListeners.add(callback);
    return () => { this.accountListeners.delete(callback); };
  }

  onChainChanged(callback: (chainId: number) => void): () => void {
    this.chainListeners.add(callback);
    return () => { this.chainListeners.delete(callback); };
  }

  private async getCurrentChainId(): Promise<number> {
    await this.ensureInit();
    const chainId = (await this.provider.request({
      method: 'eth_chainId',
    })) as string;
    return parseInt(chainId, 16);
  }

  private setupListeners(): void {
    if (!this.provider) return;

    this.provider.on('accountsChanged', (accounts: unknown) => {
      const typed = accounts as string[];
      for (const cb of this.accountListeners) { cb(typed); }
    });

    this.provider.on('chainChanged', (chainId: unknown) => {
      const typed = typeof chainId === 'string' ? parseInt(chainId, 16) : Number(chainId);
      for (const cb of this.chainListeners) { cb(typed); }
    });

    this.provider.on('session_delete', () => {
      this.session = null;
      for (const cb of this.accountListeners) { cb([]); }
    });
  }
}
