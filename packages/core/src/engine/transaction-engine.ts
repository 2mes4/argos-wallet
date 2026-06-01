import type {
  ITransactionEngine,
  InternalTransaction,
  TransactionType,
  TransactionStatus,
  TransactionEventCallback,
  CreateFiatToCryptoParams,
  CreateCryptoToFiatParams,
  CreateCryptoTransferParams,
  CreateSmartContractParams,
  TransactionFilters,
  IStorageProvider,
  IBlockchainProvider,
  IFiatProvider,
  StoredTransaction,
} from '@argos-wallet/types';
import { generateId } from '../utils';
import { TransactionFailedError } from '../errors';
import type { IEventBus } from '@argos-wallet/types';

const EVENTS = {
  TX_STATUS_CHANGE: 'transaction:status_change',
  TX_CREATED: 'transaction:created',
  TX_COMPLETED: 'transaction:completed',
  TX_FAILED: 'transaction:failed',
} as const;

export class TransactionEngine implements ITransactionEngine {
  private storage: IStorageProvider;
  private getBlockchainProvider: (network: string) => IBlockchainProvider;
  private getFiatProvider: () => IFiatProvider | null;
  private eventBus: IEventBus;
  private pollOptions: { maxAttempts: number; intervalMs: number };

  constructor(deps: {
    storage: IStorageProvider;
    eventBus: IEventBus;
    getBlockchainProvider: (network: string) => IBlockchainProvider;
    getFiatProvider: () => IFiatProvider | null;
    pollOptions?: { maxAttempts: number; intervalMs: number };
  }) {
    this.storage = deps.storage;
    this.eventBus = deps.eventBus;
    this.getBlockchainProvider = deps.getBlockchainProvider;
    this.getFiatProvider = deps.getFiatProvider;
    this.pollOptions = deps.pollOptions ?? { maxAttempts: 30, intervalMs: 5000 };
  }

  async initiateFiatToCrypto(params: CreateFiatToCryptoParams): Promise<InternalTransaction> {
    const fiatProvider = this.getFiatProvider();
    if (!fiatProvider) {
      throw new TransactionFailedError('No fiat provider configured');
    }

    const wallet = await this.storage.getWallet(params.walletId);
    if (!wallet) {
      throw new TransactionFailedError(`Wallet ${params.walletId} not found`);
    }

    const tx = this.createTransactionRecord({
      walletId: params.walletId,
      type: 'FIAT_TO_CRYPTO',
      sourceCurrency: params.sourceCurrency,
      targetCurrency: params.targetCrypto,
      sourceAmount: params.amount,
      targetAmount: params.amount,
      fee: '0',
      feeCurrency: params.sourceCurrency,
      network: params.network,
    });

    await this.storage.saveTransaction(tx);
    this.emit(EVENTS.TX_CREATED, tx);

    try {
      await this.updateStatus(tx.id, 'FIAT_PENDING');

      const customer = wallet.fiatCustomerId
        ? await fiatProvider.getCustomer(wallet.fiatCustomerId)
        : await fiatProvider.createCustomer(params.walletId);

      const depositInstructions = await fiatProvider.requestBankDeposit(
        customer.fiatCustomerId,
        params.amount,
        params.sourceCurrency,
      );

      await this.storage.updateTransaction(tx.id, {
        bankTransferId: depositInstructions.transferId,
        metadata: { depositInstructions },
      });

      const address = wallet.addresses[params.network];
      if (!address) {
        throw new TransactionFailedError(`No address found for network ${params.network}`);
      }

      await this.updateStatus(tx.id, 'CRYPTO_PENDING');

      const blockchainProvider = this.getBlockchainProvider(params.network);
      const result = await blockchainProvider.transferTokens(
        address,
        address,
        params.amount,
        params.targetCrypto,
      );

      await this.storage.updateTransaction(tx.id, {
        txHash: result.txHash,
        status: 'CONFIRMING',
      });

      this.emit(EVENTS.TX_STATUS_CHANGE, await this.storage.getTransaction(tx.id));

      const pollResult = await this.pollTransactionStatus(blockchainProvider, result.txHash, tx.id);

      if (pollResult.status === 'SUCCESS') {
        await this.updateStatus(tx.id, 'COMPLETED');
        this.emit(EVENTS.TX_COMPLETED, await this.storage.getTransaction(tx.id));
      } else {
        await this.updateStatus(tx.id, 'FAILED');
        this.emit(EVENTS.TX_FAILED, await this.storage.getTransaction(tx.id));
      }
    } catch (error) {
      await this.updateStatus(tx.id, 'FAILED');
      this.emit(EVENTS.TX_FAILED, await this.storage.getTransaction(tx.id));
      throw error;
    }

    return (await this.storage.getTransaction(tx.id)) as InternalTransaction;
  }

  async initiateCryptoToFiat(params: CreateCryptoToFiatParams): Promise<InternalTransaction> {
    const fiatProvider = this.getFiatProvider();
    if (!fiatProvider) {
      throw new TransactionFailedError('No fiat provider configured');
    }

    const wallet = await this.storage.getWallet(params.walletId);
    if (!wallet) {
      throw new TransactionFailedError(`Wallet ${params.walletId} not found`);
    }

    const address = wallet.addresses[params.network];
    if (!address) {
      throw new TransactionFailedError(`No address found for network ${params.network}`);
    }

    const tx = this.createTransactionRecord({
      walletId: params.walletId,
      type: 'CRYPTO_TO_FIAT',
      sourceCurrency: params.cryptoSymbol,
      targetCurrency: params.targetCurrency,
      sourceAmount: params.amount,
      targetAmount: params.amount,
      fee: '0',
      feeCurrency: params.cryptoSymbol,
      network: params.network,
    });

    await this.storage.saveTransaction(tx);
    this.emit(EVENTS.TX_CREATED, tx);

    try {
      await this.updateStatus(tx.id, 'CRYPTO_PENDING');

      const blockchainProvider = this.getBlockchainProvider(params.network);

      const treasuryAddress = process.env.OW_TREASURY_ADDRESS;
      if (!treasuryAddress) {
        throw new TransactionFailedError('Treasury address not configured');
      }

      const transferResult = await blockchainProvider.transferTokens(
        address,
        treasuryAddress,
        params.amount,
        params.cryptoSymbol,
      );

      await this.storage.updateTransaction(tx.id, {
        txHash: transferResult.txHash,
      });

      await this.pollTransactionStatus(blockchainProvider, transferResult.txHash, tx.id);

      await this.updateStatus(tx.id, 'FIAT_PENDING');

      if (!wallet.fiatCustomerId) {
        throw new TransactionFailedError('Wallet has no linked fiat customer');
      }

      const withdrawal = await fiatProvider.triggerBankWithdrawal(
        wallet.fiatCustomerId,
        params.targetBankAccountId,
        params.amount,
        params.targetCurrency,
      );

      await this.storage.updateTransaction(tx.id, {
        bankTransferId: withdrawal.transferId,
      });

      const withdrawalStatus = await this.pollFiatTransferStatus(fiatProvider, withdrawal.transferId, tx.id);

      if (withdrawalStatus.status === 'COMPLETED') {
        await this.updateStatus(tx.id, 'COMPLETED');
        this.emit(EVENTS.TX_COMPLETED, await this.storage.getTransaction(tx.id));
      } else {
        await this.updateStatus(tx.id, 'FAILED');
        this.emit(EVENTS.TX_FAILED, await this.storage.getTransaction(tx.id));
      }
    } catch (error) {
      await this.updateStatus(tx.id, 'FAILED');
      this.emit(EVENTS.TX_FAILED, await this.storage.getTransaction(tx.id));
      throw error;
    }

    return (await this.storage.getTransaction(tx.id)) as InternalTransaction;
  }

  async initiateCryptoTransfer(params: CreateCryptoTransferParams): Promise<InternalTransaction> {
    const wallet = await this.storage.getWallet(params.walletId);
    if (!wallet) {
      throw new TransactionFailedError(`Wallet ${params.walletId} not found`);
    }

    const address = wallet.addresses[params.network];
    if (!address) {
      throw new TransactionFailedError(`No address found for network ${params.network}`);
    }

    const tx = this.createTransactionRecord({
      walletId: params.walletId,
      type: 'CRYPTO_TRANSFER',
      sourceCurrency: params.cryptoSymbol,
      targetCurrency: params.cryptoSymbol,
      sourceAmount: params.amount,
      targetAmount: params.amount,
      fee: '0',
      feeCurrency: params.cryptoSymbol,
      network: params.network,
      metadata: { toAddress: params.toAddress },
    });

    await this.storage.saveTransaction(tx);
    this.emit(EVENTS.TX_CREATED, tx);

    try {
      await this.updateStatus(tx.id, 'CRYPTO_PENDING');

      const blockchainProvider = this.getBlockchainProvider(params.network);
      const result = await blockchainProvider.transferTokens(
        address,
        params.toAddress,
        params.amount,
        params.cryptoSymbol,
      );

      await this.storage.updateTransaction(tx.id, { txHash: result.txHash });

      const pollResult = await this.pollTransactionStatus(blockchainProvider, result.txHash, tx.id);

      if (pollResult.status === 'SUCCESS') {
        await this.updateStatus(tx.id, 'COMPLETED');
        this.emit(EVENTS.TX_COMPLETED, await this.storage.getTransaction(tx.id));
      } else {
        await this.updateStatus(tx.id, 'FAILED');
        this.emit(EVENTS.TX_FAILED, await this.storage.getTransaction(tx.id));
      }
    } catch (error) {
      await this.updateStatus(tx.id, 'FAILED');
      this.emit(EVENTS.TX_FAILED, await this.storage.getTransaction(tx.id));
      throw error;
    }

    return (await this.storage.getTransaction(tx.id)) as InternalTransaction;
  }

  async initiateSmartContractCall(params: CreateSmartContractParams): Promise<InternalTransaction> {
    const wallet = await this.storage.getWallet(params.walletId);
    if (!wallet) {
      throw new TransactionFailedError(`Wallet ${params.walletId} not found`);
    }

    const tx = this.createTransactionRecord({
      walletId: params.walletId,
      type: 'SMART_CONTRACT_CALL',
      sourceCurrency: 'NATIVE',
      targetCurrency: 'NATIVE',
      sourceAmount: params.value ?? '0',
      targetAmount: params.value ?? '0',
      fee: '0',
      feeCurrency: 'NATIVE',
      network: params.network,
      contractAddress: params.contractAddress,
      metadata: { method: params.method, args: params.args },
    });

    await this.storage.saveTransaction(tx);
    this.emit(EVENTS.TX_CREATED, tx);

    try {
      await this.updateStatus(tx.id, 'CRYPTO_PENDING');

      const blockchainProvider = this.getBlockchainProvider(params.network);
      const result = await blockchainProvider.executeSmartContract(
        params.walletId,
        params.contractAddress,
        params.abi,
        params.method,
        params.args,
        params.value,
      );

      await this.storage.updateTransaction(tx.id, { txHash: result.txHash });

      const pollResult = await this.pollTransactionStatus(blockchainProvider, result.txHash, tx.id);

      if (pollResult.status === 'SUCCESS') {
        await this.updateStatus(tx.id, 'COMPLETED');
        this.emit(EVENTS.TX_COMPLETED, await this.storage.getTransaction(tx.id));
      } else {
        await this.updateStatus(tx.id, 'FAILED');
        this.emit(EVENTS.TX_FAILED, await this.storage.getTransaction(tx.id));
      }
    } catch (error) {
      await this.updateStatus(tx.id, 'FAILED');
      this.emit(EVENTS.TX_FAILED, await this.storage.getTransaction(tx.id));
      throw error;
    }

    return (await this.storage.getTransaction(tx.id)) as InternalTransaction;
  }

  async getTransaction(transactionId: string): Promise<InternalTransaction> {
    const tx = await this.storage.getTransaction(transactionId);
    if (!tx) {
      throw new TransactionFailedError(`Transaction ${transactionId} not found`);
    }
    return tx;
  }

  async listTransactions(walletId: string, filters?: TransactionFilters): Promise<InternalTransaction[]> {
    return this.storage.listTransactions(walletId, filters);
  }

  onTransactionStatusChange(transactionId: string, callback: TransactionEventCallback): () => void {
    return this.eventBus.on(EVENTS.TX_STATUS_CHANGE, (tx: unknown) => {
      const typed = tx as InternalTransaction;
      if (typed.id === transactionId) {
        callback(typed);
      }
    });
  }

  onWalletTransaction(walletId: string, callback: TransactionEventCallback): () => void {
    const unsub1 = this.eventBus.on(EVENTS.TX_CREATED, (tx: unknown) => {
      const typed = tx as InternalTransaction;
      if (typed.walletId === walletId) callback(typed);
    });
    const unsub2 = this.eventBus.on(EVENTS.TX_STATUS_CHANGE, (tx: unknown) => {
      const typed = tx as InternalTransaction;
      if (typed.walletId === walletId) callback(typed);
    });
    const unsub3 = this.eventBus.on(EVENTS.TX_COMPLETED, (tx: unknown) => {
      const typed = tx as InternalTransaction;
      if (typed.walletId === walletId) callback(typed);
    });
    const unsub4 = this.eventBus.on(EVENTS.TX_FAILED, (tx: unknown) => {
      const typed = tx as InternalTransaction;
      if (typed.walletId === walletId) callback(typed);
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }

  async cancelTransaction(transactionId: string): Promise<InternalTransaction> {
    const tx = await this.storage.getTransaction(transactionId);
    if (!tx) {
      throw new TransactionFailedError(`Transaction ${transactionId} not found`);
    }
    if (tx.status !== 'INITIATED' && tx.status !== 'FIAT_PENDING') {
      throw new TransactionFailedError(`Cannot cancel transaction in status: ${tx.status}`);
    }
    await this.updateStatus(transactionId, 'CANCELLED');
    return (await this.storage.getTransaction(transactionId))!;
  }

  private createTransactionRecord(data: {
    walletId: string;
    type: TransactionType;
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount: string;
    targetAmount: string;
    fee: string;
    feeCurrency: string;
    network: string;
    contractAddress?: string;
    metadata?: Record<string, unknown>;
  }): StoredTransaction {
    const now = new Date();
    return {
      id: generateId(),
      walletId: data.walletId,
      type: data.type,
      status: 'INITIATED',
      sourceCurrency: data.sourceCurrency,
      targetCurrency: data.targetCurrency,
      sourceAmount: data.sourceAmount,
      targetAmount: data.targetAmount,
      fee: data.fee,
      feeCurrency: data.feeCurrency,
      network: data.network,
      contractAddress: data.contractAddress,
      metadata: data.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
  }

  private async updateStatus(txId: string, status: TransactionStatus): Promise<void> {
    const updates: Partial<StoredTransaction> = {
      status,
      updatedAt: new Date(),
    };
    if (status === 'COMPLETED' || status === 'FAILED') {
      updates.completedAt = new Date();
    }
    await this.storage.updateTransaction(txId, updates);
    const tx = await this.storage.getTransaction(txId);
    if (tx) {
      this.emit(EVENTS.TX_STATUS_CHANGE, tx);
    }
  }

  private emit(event: string, data: unknown): void {
    this.eventBus.emit(event, data);
  }

  private async pollTransactionStatus(
    provider: IBlockchainProvider,
    txHash: string,
    _txId: string,
    maxAttempts?: number,
    intervalMs?: number,
  ): Promise<{ status: string }> {
    const attempts = maxAttempts ?? this.pollOptions.maxAttempts;
    const interval = intervalMs ?? this.pollOptions.intervalMs;
    for (let i = 0; i < attempts; i++) {
      await this.sleep(interval);
      const result = await provider.getTransactionStatus(txHash);
      if (result.status === 'SUCCESS' || result.status === 'FAILED') {
        return result;
      }
    }
    return { status: 'FAILED' };
  }

  private async pollFiatTransferStatus(
    provider: IFiatProvider,
    transferId: string,
    _txId: string,
    maxAttempts?: number,
    intervalMs?: number,
  ): Promise<{ status: string }> {
    const attempts = maxAttempts ?? this.pollOptions.maxAttempts;
    const interval = intervalMs ?? this.pollOptions.intervalMs;
    for (let i = 0; i < attempts; i++) {
      await this.sleep(interval);
      const result = await provider.getTransferStatus(transferId);
      if (result.status === 'COMPLETED' || result.status === 'FAILED') {
        return result;
      }
    }
    return { status: 'FAILED' };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
