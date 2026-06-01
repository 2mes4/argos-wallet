import { WalletEngine } from '../engine/wallet-engine';
import { EventBus } from '../bus/event-bus';
import { MemoryStorage } from '@argos-wallet/storage-memory';
import type { IBlockchainProvider, IFiatProvider } from '@argos-wallet/types';

function mockBlockchainProvider(slug = 'polygon'): IBlockchainProvider {
  return {
    networkSlug: slug,
    config: {
      chainId: 137,
      name: 'Polygon',
      slug,
      rpcUrl: 'https://rpc',
      explorerUrl: 'https://explorer',
      nativeCurrency: 'POL',
      supportedTokens: [
        { symbol: 'POL', decimals: 18 },
        { symbol: 'USDC', decimals: 6, contractAddress: '0xusdc', isStablecoin: true },
      ],
    },
    initialize: jest.fn(),
    getOrCreateWallet: jest.fn().mockResolvedValue({
      address: `0x${slug}addr`,
      publicKey: `pk-${slug}`,
    }),
    getBalance: jest.fn().mockResolvedValue('100.50'),
    transferTokens: jest.fn().mockResolvedValue({
      txHash: '0xtx',
      status: 'SUCCESS',
    }),
    executeSmartContract: jest.fn().mockResolvedValue({
      txHash: '0xsc',
      status: 'SUCCESS',
    }),
    signMessage: jest.fn().mockResolvedValue('0xsig'),
    getTransactionStatus: jest.fn().mockResolvedValue({
      txHash: '0xtx',
      status: 'SUCCESS',
    }),
    destroy: jest.fn(),
  };
}

function mockFiatProvider(): IFiatProvider {
  return {
    region: 'EU',
    supportedCurrencies: ['EUR'],
    initialize: jest.fn(),
    createCustomer: jest.fn().mockResolvedValue({
      fiatCustomerId: 'fiat-cust-1',
      status: 'ACTIVE',
    }),
    getCustomer: jest.fn().mockResolvedValue({
      fiatCustomerId: 'fiat-cust-1',
      status: 'ACTIVE',
    }),
    linkBankAccount: jest.fn().mockResolvedValue({
      bankAccountId: 'ba-1',
      maskedIban: 'ES****1234',
      currency: 'EUR',
      status: 'LINKED',
    }),
    getLinkedBankAccounts: jest.fn().mockResolvedValue([]),
    triggerBankWithdrawal: jest.fn().mockResolvedValue({
      transferId: 'tr-1',
      status: 'PROCESSING',
      estimatedArrival: new Date(),
    }),
    requestBankDeposit: jest.fn().mockResolvedValue({
      transferId: 'dep-1',
      destinationIban: 'ES911111222233334444',
      reference: 'OW-REF',
      amount: '100',
      currency: 'EUR',
    }),
    getTransferStatus: jest.fn().mockResolvedValue({
      transferId: 'tr-1',
      status: 'COMPLETED',
      estimatedArrival: new Date(),
    }),
    destroy: jest.fn(),
  };
}

describe('WalletEngine', () => {
  let engine: WalletEngine;
  let storage: MemoryStorage;
  let eventBus: EventBus;
  let provider: ReturnType<typeof mockBlockchainProvider>;

  beforeEach(async () => {
    storage = new MemoryStorage();
    await storage.initialize();
    eventBus = new EventBus();
    provider = mockBlockchainProvider();
    engine = new WalletEngine({ storage, eventBus });
    engine.registerNetworkProvider(provider);
  });

  afterEach(async () => {
    await engine.destroy();
  });

  describe('createWallet', () => {
    it('should create a wallet with addresses on all configured networks', async () => {
      const wallet = await engine.createWallet();
      expect(wallet.walletId).toBeTruthy();
      expect(typeof wallet.walletId).toBe('string');
      expect(wallet.addresses['polygon']).toBe('0xpolygonaddr');
      expect(wallet.createdAt).toBeInstanceOf(Date);
    });

    it('should emit wallet:created event', async () => {
      const listener = jest.fn();
      eventBus.on('wallet:created', listener);
      await engine.createWallet();
      expect(listener).toHaveBeenCalled();
    });

    it('should create different wallet IDs for each call', async () => {
      const w1 = await engine.createWallet();
      const w2 = await engine.createWallet();
      expect(w1.walletId).not.toBe(w2.walletId);
    });

    it('should create wallet on multiple networks', async () => {
      const baseProvider = mockBlockchainProvider('base');
      engine.registerNetworkProvider(baseProvider);
      const wallet = await engine.createWallet();
      expect(wallet.addresses['polygon']).toBeTruthy();
      expect(wallet.addresses['base']).toBeTruthy();
    });
  });

  describe('getWallet', () => {
    it('should throw WalletNotFoundError for non-existent wallet', async () => {
      await expect(engine.getWallet('nonexistent')).rejects.toThrow('Wallet not found');
    });

    it('should return wallet info with balances', async () => {
      const created = await engine.createWallet();
      const info = await engine.getWallet(created.walletId);
      expect(info.walletId).toBe(created.walletId);
      expect(info.balances.length).toBeGreaterThan(0);
    });
  });

  describe('getBalance', () => {
    it('should return balance for a specific token', async () => {
      const wallet = await engine.createWallet();
      const balance = await engine.getBalance(wallet.walletId, 'polygon', 'USDC');
      expect(balance).toBe('100.50');
    });

    it('should throw for non-existent wallet', async () => {
      await expect(engine.getBalance('nope', 'polygon', 'USDC')).rejects.toThrow();
    });

    it('should throw for unconfigured network', async () => {
      const wallet = await engine.createWallet();
      await expect(engine.getBalance(wallet.walletId, 'solana', 'SOL')).rejects.toThrow('not configured');
    });
  });

  describe('getAllBalances', () => {
    it('should return balances for all tokens on all networks', async () => {
      const wallet = await engine.createWallet();
      const balances = await engine.getAllBalances(wallet.walletId);
      expect(balances.length).toBe(2); // POL + USDC
      expect(balances[0].network).toBe('polygon');
    });
  });

  describe('signMessage', () => {
    it('should sign a message via the blockchain provider', async () => {
      const wallet = await engine.createWallet();
      const sig = await engine.signMessage(wallet.walletId, 'polygon', 'hello');
      expect(sig).toBe('0xsig');
    });
  });

  describe('external wallet linking', () => {
    it('should list available external providers', () => {
      const providers = engine.getAvailableExternalProviders();
      expect(providers).toContainEqual(expect.objectContaining({ type: 'metamask' }));
      expect(providers).toContainEqual(expect.objectContaining({ type: 'walletconnect' }));
    });

    it('should throw when linking with unregistered connector', async () => {
      const wallet = await engine.createWallet();
      await expect(engine.linkExternalWallet(wallet.walletId, 'metamask')).rejects.toThrow('not configured');
    });
  });
});
