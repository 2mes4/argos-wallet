import { TransactionEngine } from '../engine/transaction-engine';
import { EventBus } from '../bus/event-bus';
import { MemoryStorage } from '@argos-wallet/storage-memory';
import type { IBlockchainProvider, StoredWallet } from '@argos-wallet/types';

function mockBlockchain(): IBlockchainProvider {
  let callCount = 0;
  return {
    networkSlug: 'polygon',
    config: {
      chainId: 137, name: 'Polygon', slug: 'polygon',
      rpcUrl: 'https://rpc', explorerUrl: 'https://explorer',
      nativeCurrency: 'POL',
      supportedTokens: [{ symbol: 'USDC', decimals: 6, contractAddress: '0xusdc', isStablecoin: true }],
    },
    initialize: jest.fn(),
    getOrCreateWallet: jest.fn().mockResolvedValue({ address: '0xuser', publicKey: 'pk' }),
    getBalance: jest.fn().mockResolvedValue('1000'),
    transferTokens: jest.fn().mockImplementation(async () => ({
      txHash: `0xhash-${++callCount}`,
      status: 'SUCCESS' as const,
    })),
    executeSmartContract: jest.fn().mockResolvedValue({ txHash: '0xsc', status: 'SUCCESS' as const }),
    signMessage: jest.fn().mockResolvedValue('0xsig'),
    getTransactionStatus: jest.fn().mockResolvedValue({ txHash: '0xhash', status: 'SUCCESS' as const }),
    destroy: jest.fn(),
  };
}

describe('TransactionEngine', () => {
  let engine: TransactionEngine;
  let storage: MemoryStorage;
  let eventBus: EventBus;
  let blockchain: IBlockchainProvider;

  beforeEach(async () => {
    storage = new MemoryStorage();
    await storage.initialize();
    eventBus = new EventBus();
    blockchain = mockBlockchain();

    const wallet: StoredWallet = {
      walletId: 'w-1',
      addresses: { polygon: '0xuser' },
      encryptedKeys: { polygon: 'pk' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await storage.saveWallet(wallet);

    engine = new TransactionEngine({
      storage,
      eventBus,
      getBlockchainProvider: (network: string) => {
        if (network !== 'polygon') throw new Error('Network not found');
        return blockchain;
      },
      getFiatProvider: () => null,
      pollOptions: { maxAttempts: 2, intervalMs: 10 },
    });
  });

  afterEach(async () => {
    await storage.destroy();
  });

  describe('initiateCryptoTransfer', () => {
    it('should create and complete a crypto transfer', async () => {
      const tx = await engine.initiateCryptoTransfer({
        walletId: 'w-1',
        network: 'polygon',
        cryptoSymbol: 'USDC',
        amount: '10',
        toAddress: '0xrecipient',
      });

      expect(tx).toBeTruthy();
      expect(tx.type).toBe('CRYPTO_TRANSFER');
      expect(tx.sourceAmount).toBe('10');
      expect(tx.sourceCurrency).toBe('USDC');
      expect(tx.network).toBe('polygon');
    });

    it('should emit transaction events', async () => {
      const createdListener = jest.fn();
      const statusListener = jest.fn();
      eventBus.on('transaction:created', createdListener);
      eventBus.on('transaction:status_change', statusListener);

      await engine.initiateCryptoTransfer({
        walletId: 'w-1', network: 'polygon',
        cryptoSymbol: 'USDC', amount: '5', toAddress: '0xto',
      });

      expect(createdListener).toHaveBeenCalled();
      expect(statusListener).toHaveBeenCalled();
    });

    it('should throw for non-existent wallet', async () => {
      await expect(engine.initiateCryptoTransfer({
        walletId: 'nope', network: 'polygon',
        cryptoSymbol: 'USDC', amount: '10', toAddress: '0xto',
      })).rejects.toThrow();
    });

    it('should throw for unknown network', async () => {
      await expect(engine.initiateCryptoTransfer({
        walletId: 'w-1', network: 'solana',
        cryptoSymbol: 'SOL', amount: '10', toAddress: '0xto',
      })).rejects.toThrow();
    });
  });

  describe('initiateSmartContractCall', () => {
    it('should execute a smart contract and return transaction', async () => {
      const tx = await engine.initiateSmartContractCall({
        walletId: 'w-1',
        network: 'polygon',
        contractAddress: '0xcontract',
        abi: [{ name: 'transfer', type: 'function' }],
        method: 'transfer',
        args: ['0xto', '1000'],
        value: '0',
      });

      expect(tx.type).toBe('SMART_CONTRACT_CALL');
      expect(tx.contractAddress).toBe('0xcontract');
      expect(blockchain.executeSmartContract).toHaveBeenCalled();
    });
  });

  describe('getTransaction', () => {
    it('should retrieve a transaction by id', async () => {
      const created = await engine.initiateCryptoTransfer({
        walletId: 'w-1', network: 'polygon',
        cryptoSymbol: 'USDC', amount: '10', toAddress: '0xto',
      });

      const fetched = await engine.getTransaction(created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.walletId).toBe('w-1');
    });

    it('should throw for non-existent transaction', async () => {
      await expect(engine.getTransaction('nope')).rejects.toThrow('not found');
    });
  });

  describe('listTransactions', () => {
    it('should list transactions for a wallet', async () => {
      await engine.initiateCryptoTransfer({
        walletId: 'w-1', network: 'polygon',
        cryptoSymbol: 'USDC', amount: '10', toAddress: '0xto1',
      });
      await engine.initiateCryptoTransfer({
        walletId: 'w-1', network: 'polygon',
        cryptoSymbol: 'USDC', amount: '20', toAddress: '0xto2',
      });

      const list = await engine.listTransactions('w-1');
      expect(list).toHaveLength(2);
    });

    it('should filter by type', async () => {
      await engine.initiateCryptoTransfer({
        walletId: 'w-1', network: 'polygon',
        cryptoSymbol: 'USDC', amount: '10', toAddress: '0xto',
      });
      await engine.initiateSmartContractCall({
        walletId: 'w-1', network: 'polygon',
        contractAddress: '0xc', abi: [], method: 'foo', args: [],
      });

      const transfers = await engine.listTransactions('w-1', { type: 'CRYPTO_TRANSFER' });
      const contracts = await engine.listTransactions('w-1', { type: 'SMART_CONTRACT_CALL' });
      expect(transfers).toHaveLength(1);
      expect(contracts).toHaveLength(1);
    });
  });

  describe('cancelTransaction', () => {
    it('should cancel a transaction in INITIATED status', async () => {
      const tx = await storage.saveTransaction({
        id: 'tx-manual',
        walletId: 'w-1',
        type: 'CRYPTO_TRANSFER',
        status: 'INITIATED',
        sourceCurrency: 'USDC',
        targetCurrency: 'USDC',
        sourceAmount: '10',
        targetAmount: '10',
        fee: '0',
        feeCurrency: 'USDC',
        network: 'polygon',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const cancelled = await engine.cancelTransaction('tx-manual');
      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should throw when cancelling a completed transaction', async () => {
      await storage.saveTransaction({
        id: 'tx-done',
        walletId: 'w-1',
        type: 'CRYPTO_TRANSFER',
        status: 'COMPLETED',
        sourceCurrency: 'USDC',
        targetCurrency: 'USDC',
        sourceAmount: '10',
        targetAmount: '10',
        fee: '0',
        feeCurrency: 'USDC',
        network: 'polygon',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(engine.cancelTransaction('tx-done')).rejects.toThrow('Cannot cancel');
    });
  });

  describe('onWalletTransaction', () => {
    it('should call callback for all wallet tx events', async () => {
      const callback = jest.fn();
      engine.onWalletTransaction('w-1', callback);

      await engine.initiateCryptoTransfer({
        walletId: 'w-1', network: 'polygon',
        cryptoSymbol: 'USDC', amount: '10', toAddress: '0xto',
      });

      expect(callback).toHaveBeenCalled();
      const tx = callback.mock.calls[0][0];
      expect(tx.walletId).toBe('w-1');
    });
  });
});
