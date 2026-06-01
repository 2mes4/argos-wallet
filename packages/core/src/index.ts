import type {
  IBlockchainProvider,
  IFiatProvider,
  IStorageProvider,
  IExternalWalletConnector,
  ExternalWalletConnection,
  ExternalWalletAccount,
  MultiChainWallet,
  WalletInfo,
  InternalTransaction,
  TransactionFilters,
  TransactionEventCallback,
  WalletBalance,
} from '@argos-wallet/types';
import { WalletEngine } from './engine/wallet-engine';
import { TransactionEngine } from './engine/transaction-engine';
import { EventBus } from './bus/event-bus';
import {
  ArgosError,
  WalletNotFoundError,
  ProviderNotConfiguredError,
  TransactionFailedError,
  InsufficientBalanceError,
  NetworkNotSupportedError,
} from './errors';

export interface ArgosConfig {
  storage: IStorageProvider;
  networks?: IBlockchainProvider[];
  fiat?: IFiatProvider;
  externalConnectors?: IExternalWalletConnector[];
}

export class Argos {
  private walletEngine: WalletEngine;
  private transactionEngine: TransactionEngine;
  private eventBus: EventBus;

  constructor(config: ArgosConfig) {
    this.eventBus = new EventBus();

    this.walletEngine = new WalletEngine({
      storage: config.storage,
      eventBus: this.eventBus,
    });

    if (config.networks) {
      for (const provider of config.networks) {
        this.walletEngine.registerNetworkProvider(provider);
      }
    }

    if (config.fiat) {
      this.walletEngine.registerFiatProvider(config.fiat);
    }

    if (config.externalConnectors) {
      for (const connector of config.externalConnectors) {
        this.walletEngine.registerExternalConnector(connector);
      }
    }

    this.transactionEngine = new TransactionEngine({
      storage: config.storage,
      eventBus: this.eventBus,
      getBlockchainProvider: (network: string) => this.walletEngine.getNetworkProvider(network),
      getFiatProvider: () => this.walletEngine.getFiatProvider(),
    });
  }

  get wallets(): Pick<WalletEngine,
    'createWallet' |
    'getWallet' |
    'getBalance' |
    'getAllBalances' |
    'signMessage' |
    'linkExternalWallet' |
    'getExternalConnections' |
    'unlinkExternalWallet' |
    'signWithExternalWallet' |
    'getAvailableExternalProviders' |
    'getExternalConnector'
  > {
    return this.walletEngine;
  }

  get transactions(): Pick<TransactionEngine,
    'initiateFiatToCrypto' |
    'initiateCryptoToFiat' |
    'initiateCryptoTransfer' |
    'initiateSmartContractCall' |
    'getTransaction' |
    'listTransactions' |
    'onTransactionStatusChange' |
    'onWalletTransaction' |
    'cancelTransaction'
  > {
    return this.transactionEngine;
  }

  on(event: string, callback: TransactionEventCallback): () => void {
    return this.eventBus.on(event, callback as (data: unknown) => void);
  }

  addNetwork(provider: IBlockchainProvider): void {
    this.walletEngine.registerNetworkProvider(provider);
  }

  setFiatProvider(provider: IFiatProvider): void {
    this.walletEngine.registerFiatProvider(provider);
  }

  addExternalConnector(connector: IExternalWalletConnector): void {
    this.walletEngine.registerExternalConnector(connector);
  }

  async destroy(): Promise<void> {
    await this.walletEngine.destroy();
  }
}

export {
  ArgosError,
  WalletNotFoundError,
  ProviderNotConfiguredError,
  TransactionFailedError,
  InsufficientBalanceError,
  NetworkNotSupportedError,
};

export type {
  IBlockchainProvider,
  IFiatProvider,
  IStorageProvider,
  IExternalWalletConnector,
  ExternalWalletConnection,
  ExternalWalletAccount,
  MultiChainWallet,
  WalletInfo,
  InternalTransaction,
  TransactionFilters,
  TransactionEventCallback,
  WalletBalance,
};
