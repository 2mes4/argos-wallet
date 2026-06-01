import { MemoryStorage } from '../index';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(async () => {
    storage = new MemoryStorage();
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.destroy();
  });

  describe('Wallets', () => {
    it('should save and retrieve a wallet', async () => {
      const wallet = {
        walletId: 'w-1',
        addresses: { polygon: '0xabc' },
        encryptedKeys: { polygon: 'key' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await storage.saveWallet(wallet);
      const result = await storage.getWallet('w-1');
      expect(result).toBeTruthy();
      expect(result!.walletId).toBe('w-1');
      expect(result!.addresses.polygon).toBe('0xabc');
    });

    it('should return null for non-existent wallet', async () => {
      const result = await storage.getWallet('nonexistent');
      expect(result).toBeNull();
    });

    it('should update a wallet', async () => {
      const wallet = {
        walletId: 'w-1',
        addresses: { polygon: '0xabc' },
        encryptedKeys: { polygon: 'key' },
        fiatCustomerId: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await storage.saveWallet(wallet);
      const updated = await storage.updateWallet('w-1', {
        addresses: { polygon: '0xabc', base: '0xdef' },
        fiatCustomerId: 'fiat-123',
      });
      expect(updated.addresses.base).toBe('0xdef');
      expect(updated.fiatCustomerId).toBe('fiat-123');
    });

    it('should throw when updating non-existent wallet', async () => {
      await expect(storage.updateWallet('nope', { addresses: {} })).rejects.toThrow();
    });
  });

  describe('Transactions', () => {
    it('should save and retrieve a transaction', async () => {
      const tx = {
        id: 'tx-1',
        walletId: 'w-1',
        type: 'CRYPTO_TRANSFER' as const,
        status: 'COMPLETED' as const,
        sourceCurrency: 'USDC',
        targetCurrency: 'USDC',
        sourceAmount: '10',
        targetAmount: '10',
        fee: '0.01',
        feeCurrency: 'POL',
        network: 'polygon',
        txHash: '0xhash',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await storage.saveTransaction(tx);
      const result = await storage.getTransaction('tx-1');
      expect(result).toBeTruthy();
      expect(result!.type).toBe('CRYPTO_TRANSFER');
      expect(result!.txHash).toBe('0xhash');
    });

    it('should list transactions for a wallet', async () => {
      for (let i = 0; i < 5; i++) {
        await storage.saveTransaction({
          id: `tx-${i}`,
          walletId: 'w-1',
          type: i % 2 === 0 ? 'CRYPTO_TRANSFER' as const : 'FIAT_TO_CRYPTO' as const,
          status: 'COMPLETED' as const,
          sourceCurrency: 'USDC',
          targetCurrency: 'USDC',
          sourceAmount: '10',
          targetAmount: '10',
          fee: '0',
          feeCurrency: 'POL',
          network: 'polygon',
          metadata: {},
          createdAt: new Date(Date.now() + i * 1000),
          updatedAt: new Date(),
        });
      }

      const all = await storage.listTransactions('w-1');
      expect(all).toHaveLength(5);

      const transfers = await storage.listTransactions('w-1', { type: 'CRYPTO_TRANSFER' });
      expect(transfers).toHaveLength(3);
    });

    it('should filter transactions by status', async () => {
      await storage.saveTransaction({
        id: 'tx-ok', walletId: 'w-1', type: 'CRYPTO_TRANSFER',
        status: 'COMPLETED', sourceCurrency: 'USDC', targetCurrency: 'USDC',
        sourceAmount: '10', targetAmount: '10', fee: '0', feeCurrency: 'POL',
        network: 'polygon', metadata: {}, createdAt: new Date(), updatedAt: new Date(),
      });
      await storage.saveTransaction({
        id: 'tx-fail', walletId: 'w-1', type: 'CRYPTO_TRANSFER',
        status: 'FAILED', sourceCurrency: 'USDC', targetCurrency: 'USDC',
        sourceAmount: '5', targetAmount: '5', fee: '0', feeCurrency: 'POL',
        network: 'polygon', metadata: {}, createdAt: new Date(), updatedAt: new Date(),
      });

      const completed = await storage.listTransactions('w-1', { status: 'COMPLETED' });
      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('tx-ok');
    });

    it('should find transaction by txHash', async () => {
      await storage.saveTransaction({
        id: 'tx-1', walletId: 'w-1', type: 'CRYPTO_TRANSFER',
        status: 'COMPLETED', sourceCurrency: 'USDC', targetCurrency: 'USDC',
        sourceAmount: '10', targetAmount: '10', fee: '0', feeCurrency: 'POL',
        network: 'polygon', txHash: '0xunique', metadata: {},
        createdAt: new Date(), updatedAt: new Date(),
      });

      const found = await storage.getTransactionByTxHash('0xunique');
      expect(found).toBeTruthy();
      expect(found!.id).toBe('tx-1');
    });

    it('should paginate transactions with limit and offset', async () => {
      for (let i = 0; i < 10; i++) {
        await storage.saveTransaction({
          id: `tx-${i}`, walletId: 'w-1', type: 'CRYPTO_TRANSFER',
          status: 'COMPLETED', sourceCurrency: 'USDC', targetCurrency: 'USDC',
          sourceAmount: `${i}`, targetAmount: `${i}`, fee: '0', feeCurrency: 'POL',
          network: 'polygon', metadata: {},
          createdAt: new Date(Date.now() + i * 1000), updatedAt: new Date(),
        });
      }

      const page1 = await storage.listTransactions('w-1', { limit: 3, offset: 0 });
      const page2 = await storage.listTransactions('w-1', { limit: 3, offset: 3 });
      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(3);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('Bank Accounts', () => {
    it('should save and list bank accounts', async () => {
      await storage.saveBankAccount({
        id: 'ba-1', walletId: 'w-1', fiatProviderBankId: 'ext-1',
        maskedIban: 'ES****1234', currency: 'EUR', status: 'LINKED',
        createdAt: new Date(),
      });
      await storage.saveBankAccount({
        id: 'ba-2', walletId: 'w-1', fiatProviderBankId: 'ext-2',
        maskedIban: 'ES****5678', currency: 'EUR', status: 'LINKED',
        createdAt: new Date(),
      });

      const accounts = await storage.getBankAccounts('w-1');
      expect(accounts).toHaveLength(2);
      expect(accounts[0].maskedIban).toBe('ES****1234');
    });

    it('should get a single bank account', async () => {
      await storage.saveBankAccount({
        id: 'ba-1', walletId: 'w-1', fiatProviderBankId: 'ext-1',
        maskedIban: 'ES****1234', currency: 'EUR', status: 'LINKED',
        createdAt: new Date(),
      });

      const account = await storage.getBankAccount('ba-1');
      expect(account).toBeTruthy();
      expect(account!.currency).toBe('EUR');
    });
  });

  describe('External Connections', () => {
    it('should save and list external wallet connections', async () => {
      await storage.saveExternalConnection({
        id: 'ec-1', walletId: 'w-1', provider: 'metamask',
        address: '0x123', chainId: 137, metadata: {},
        connectedAt: new Date(),
      });
      await storage.saveExternalConnection({
        id: 'ec-2', walletId: 'w-1', provider: 'walletconnect',
        address: '0x456', chainId: 1, metadata: {},
        connectedAt: new Date(),
      });

      const connections = await storage.getExternalConnections('w-1');
      expect(connections).toHaveLength(2);
      expect(connections[0].provider).toBe('metamask');
      expect(connections[1].provider).toBe('walletconnect');
    });

    it('should delete an external connection', async () => {
      await storage.saveExternalConnection({
        id: 'ec-1', walletId: 'w-1', provider: 'metamask',
        address: '0x123', chainId: 137, metadata: {},
        connectedAt: new Date(),
      });

      await storage.deleteExternalConnection('ec-1');
      const connections = await storage.getExternalConnections('w-1');
      expect(connections).toHaveLength(0);
    });

    it('should get a single external connection', async () => {
      await storage.saveExternalConnection({
        id: 'ec-1', walletId: 'w-1', provider: 'metamask',
        address: '0x123', chainId: 137, metadata: {},
        connectedAt: new Date(),
      });

      const conn = await storage.getExternalConnection('ec-1');
      expect(conn).toBeTruthy();
      expect(conn!.address).toBe('0x123');
    });
  });
});
