import type {
  IWalletEngine,
  MultiChainWallet,
  WalletInfo,
  WalletBalance,
  IBlockchainProvider,
  IFiatProvider,
  IStorageProvider,
  StoredWallet,
  IExternalWalletConnector,
  ExternalWalletConnection,
} from '@argos-wallet/types';
import { generateId } from '../utils';
import { WalletNotFoundError, ProviderNotConfiguredError } from '../errors';
import type { IEventBus } from '@argos-wallet/types';

export class WalletEngine implements IWalletEngine {
  private storage: IStorageProvider;
  private eventBus: IEventBus;
  private networkProviders = new Map<string, IBlockchainProvider>();
  private fiatProvider: IFiatProvider | null = null;
  private externalConnectors = new Map<string, IExternalWalletConnector>();

  constructor(deps: {
    storage: IStorageProvider;
    eventBus: IEventBus;
  }) {
    this.storage = deps.storage;
    this.eventBus = deps.eventBus;
  }

  registerNetworkProvider(provider: IBlockchainProvider): void {
    this.networkProviders.set(provider.networkSlug, provider);
  }

  registerFiatProvider(provider: IFiatProvider): void {
    this.fiatProvider = provider;
  }

  registerExternalConnector(connector: IExternalWalletConnector): void {
    this.externalConnectors.set(connector.providerType, connector);
  }

  getExternalConnector(providerType: string): IExternalWalletConnector | undefined {
    return this.externalConnectors.get(providerType);
  }

  getAvailableExternalProviders(): Array<{
    type: string;
    name: string;
    isAvailable: boolean;
  }> {
    const providers = [
      { type: 'metamask', name: 'MetaMask' },
      { type: 'walletconnect', name: 'WalletConnect' },
      { type: 'coinbase', name: 'Coinbase Wallet' },
    ];
    return providers.map((p) => {
      const connector = this.externalConnectors.get(p.type);
      return {
        type: p.type,
        name: p.name,
        isAvailable: connector?.isAvailable ?? false,
      };
    });
  }

  async linkExternalWallet(
    walletId: string,
    providerType: string,
    chainId?: number,
  ): Promise<ExternalWalletConnection> {
    const wallet = await this.storage.getWallet(walletId);
    if (!wallet) {
      throw new WalletNotFoundError(walletId);
    }

    const connector = this.externalConnectors.get(providerType);
    if (!connector) {
      throw new ProviderNotConfiguredError(`External wallet: ${providerType}`);
    }

    const account = await connector.connect(chainId);

    const connection: ExternalWalletConnection = {
      id: generateId(),
      walletId,
      provider: providerType as ExternalWalletConnection['provider'],
      address: account.address,
      chainId: account.chainId,
      connectedAt: new Date(),
      metadata: { ...account },
    };

    await this.storage.saveExternalConnection({
      id: connection.id,
      walletId,
      provider: connection.provider,
      address: connection.address,
      chainId: connection.chainId,
      metadata: connection.metadata,
      connectedAt: connection.connectedAt,
    });

    if (!wallet.addresses[`external-${providerType}`]) {
      wallet.addresses[`external-${providerType}`] = account.address;
      await this.storage.updateWallet(walletId, {
        addresses: wallet.addresses,
      });
    }

    this.eventBus.emit('wallet:external-linked', connection);

    return connection;
  }

  async getExternalConnections(walletId: string): Promise<ExternalWalletConnection[]> {
    const stored = await this.storage.getExternalConnections(walletId);
    return stored.map((s) => ({
      id: s.id,
      walletId: s.walletId,
      provider: s.provider,
      address: s.address,
      chainId: s.chainId,
      connectedAt: s.connectedAt,
      metadata: s.metadata,
    }));
  }

  async unlinkExternalWallet(connectionId: string): Promise<void> {
    const connection = await this.storage.getExternalConnection(connectionId);
    if (!connection) {
      throw new ProviderNotConfiguredError(`Connection: ${connectionId}`);
    }

    const connector = this.externalConnectors.get(connection.provider);
    if (connector) {
      try {
        await connector.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }

    await this.storage.deleteExternalConnection(connectionId);
    this.eventBus.emit('wallet:external-unlinked', { connectionId });
  }

  async signWithExternalWallet(
    providerType: string,
    message: string,
  ): Promise<string> {
    const connector = this.externalConnectors.get(providerType);
    if (!connector) {
      throw new ProviderNotConfiguredError(`External wallet: ${providerType}`);
    }
    return connector.signMessage(message);
  }

  async createWallet(): Promise<MultiChainWallet> {
    const walletId = generateId();
    const addresses: Record<string, string> = {};
    const encryptedKeys: Record<string, string> = {};

    for (const [slug, provider] of this.networkProviders) {
      const account = await provider.getOrCreateWallet(walletId);
      addresses[slug] = account.address;
      encryptedKeys[slug] = account.publicKey;
    }

    const now = new Date();
    const storedWallet: StoredWallet = {
      walletId,
      addresses,
      encryptedKeys,
      createdAt: now,
      updatedAt: now,
    };

    await this.storage.saveWallet(storedWallet);

    this.eventBus.emit('wallet:created', storedWallet);

    return {
      walletId,
      addresses,
      createdAt: now,
    };
  }

  async getWallet(walletId: string): Promise<WalletInfo> {
    const stored = await this.storage.getWallet(walletId);
    if (!stored) {
      throw new WalletNotFoundError(walletId);
    }

    const balances = await this.getAllBalances(walletId);

    let linkedBanks: import('@argos-wallet/types').BankAccountDetails[] = [];
    if (this.fiatProvider && stored.fiatCustomerId) {
      try {
        linkedBanks = await this.fiatProvider.getLinkedBankAccounts(stored.fiatCustomerId);
      } catch {
        // Return empty if fiat lookup fails
      }
    }

    return {
      walletId: stored.walletId,
      addresses: stored.addresses,
      balances,
      linkedBanks,
      createdAt: stored.createdAt,
    };
  }

  async getBalance(walletId: string, network: string, token: string): Promise<string> {
    const stored = await this.storage.getWallet(walletId);
    if (!stored) {
      throw new WalletNotFoundError(walletId);
    }

    const address = stored.addresses[network];
    if (!address) {
      throw new ProviderNotConfiguredError(`Network: ${network}`);
    }

    const provider = this.getNetworkProvider(network);
    return provider.getBalance(address, token);
  }

  async getAllBalances(walletId: string): Promise<WalletBalance[]> {
    const stored = await this.storage.getWallet(walletId);
    if (!stored) {
      throw new WalletNotFoundError(walletId);
    }

    const balances: WalletBalance[] = [];

    for (const [slug, provider] of this.networkProviders) {
      const address = stored.addresses[slug];
      if (!address) continue;

      for (const token of provider.config.supportedTokens) {
        try {
          const balance = await provider.getBalance(address, token.symbol);
          balances.push({
            network: slug,
            token: token.symbol,
            balance,
            decimals: token.decimals,
          });
        } catch {
          // Skip tokens that fail to fetch
        }
      }
    }

    return balances;
  }

  async signMessage(walletId: string, network: string, message: string): Promise<string> {
    const provider = this.getNetworkProvider(network);
    return provider.signMessage(walletId, message);
  }

  async destroy(): Promise<void> {
    for (const provider of this.networkProviders.values()) {
      await provider.destroy();
    }
    if (this.fiatProvider) {
      await this.fiatProvider.destroy();
    }
    await this.storage.destroy();
    this.eventBus.removeAllListeners();
  }

  getNetworkProvider(network: string): IBlockchainProvider {
    const provider = this.networkProviders.get(network);
    if (!provider) {
      throw new ProviderNotConfiguredError(`Network: ${network}`);
    }
    return provider;
  }

  getFiatProvider(): IFiatProvider | null {
    return this.fiatProvider;
  }
}
