# Creating Custom Providers

The Open Wallet SDK is designed around a plugin architecture. You can add support for any blockchain or fiat gateway by implementing the standard interfaces.

## Custom Blockchain Provider

Implement `IBlockchainProvider` to add support for a new network:

```typescript
import type {
  IBlockchainProvider,
  NetworkConfig,
  WalletAccount,
  TransactionResult,
  GasConfig,
} from '@open-wallet/types';

export class SolanaProvider implements IBlockchainProvider {
  readonly networkSlug = 'solana';
  readonly config: NetworkConfig = {
    chainId: 0,
    name: 'Solana',
    slug: 'solana',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    nativeCurrency: 'SOL',
    supportedTokens: [
      { symbol: 'SOL', decimals: 9 },
      { symbol: 'USDC', decimals: 6, contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', isStablecoin: true },
    ],
  };

  private connection: any; // Solana connection
  private keypairs = new Map<string, any>();

  async initialize(config: NetworkConfig): Promise<void> {
    // Set up Solana RPC connection
  }

  async getOrCreateWallet(walletId: string): Promise<WalletAccount> {
    // Derive Solana keypair from walletId deterministically
    // Return the public key as address
  }

  async getBalance(address: string, tokenSymbol: string): Promise<string> {
    // Query Solana for SOL or SPL token balance
  }

  async transferTokens(
    fromAddress: string,
    toAddress: string,
    amount: string,
    tokenSymbol: string,
    gasConfig?: GasConfig,
  ): Promise<TransactionResult> {
    // Build and send Solana transaction
  }

  async executeSmartContract(
    walletId: string,
    contractAddress: string,
    abi: unknown[],
    method: string,
    args: unknown[],
    value?: string,
    gasConfig?: GasConfig,
  ): Promise<TransactionResult> {
    // Execute Solana program instruction
  }

  async signMessage(walletId: string, message: string): Promise<string> {
    // Sign message with Solana keypair
  }

  async getTransactionStatus(txHash: string): Promise<TransactionResult> {
    // Check Solana transaction confirmation status
  }

  async destroy(): Promise<void> {
    // Clean up resources
  }
}
```

### Register the custom provider

```typescript
import { OpenWallet } from '@open-wallet/core';
import { SolanaProvider } from './solana-provider';

const sdk = new OpenWallet({
  storage: new MemoryStorage(),
  networks: [new SolanaProvider()],
});

const wallet = await sdk.wallets.createWallet();
// wallet.addresses = { "solana": "DRpbCBMxVnDK7maPMoGQfFiB4P4cByAHpLMkP1g8vAJw" }
```

## Custom Fiat Provider

Implement `IFiatProvider` to integrate a new payment gateway:

```typescript
import type {
  IFiatProvider,
  FiatCustomer,
  BankAccountDetails,
  TransferResult,
  DepositInstructions,
} from '@open-wallet/types';

export class StripeFiatProvider implements IFiatProvider {
  readonly region = 'GLOBAL';
  readonly supportedCurrencies = ['USD', 'EUR', 'GBP'];

  private stripe: any; // Stripe SDK instance

  constructor(config: { apiKey: string }) {
    // Initialize Stripe
  }

  async initialize(config: Record<string, unknown>): Promise<void> {
    // Configure the provider
  }

  async createCustomer(walletId: string, metadata?: Record<string, unknown>): Promise<FiatCustomer> {
    // const customer = await this.stripe.customers.create({
    //   metadata: { walletId, ...metadata }
    // });
    return {
      fiatCustomerId: 'cus_xxx',
      status: 'ACTIVE',
      kycRequired: false,
    };
  }

  async getCustomer(fiatCustomerId: string): Promise<FiatCustomer> {
    // Retrieve Stripe customer
  }

  async linkBankAccount(fiatCustomerId: string, bankData: any): Promise<BankAccountDetails> {
    // Create bank account token and attach to customer
  }

  async getLinkedBankAccounts(fiatCustomerId: string): Promise<BankAccountDetails[]> {
    // List customer's bank accounts
  }

  async triggerBankWithdrawal(
    fiatCustomerId: string,
    bankAccountId: string,
    amount: string,
    currency: string,
  ): Promise<TransferResult> {
    // Create a Stripe payout
  }

  async requestBankDeposit(
    fiatCustomerId: string,
    amount: string,
    currency: string,
  ): Promise<DepositInstructions> {
    // Return Stripe payment intent or checkout URL
  }

  async getTransferStatus(transferId: string): Promise<TransferResult> {
    // Check payout/payment status
  }

  async destroy(): Promise<void> {}
}
```

## Custom Storage Provider

Implement `IStorageProvider` for production database persistence:

```typescript
import type {
  IStorageProvider,
  StoredWallet,
  StoredTransaction,
  StoredBankAccount,
  TransactionFilters,
} from '@open-wallet/types';

export class PostgresStorage implements IStorageProvider {
  private pool: any; // pg.Pool

  constructor(connectionString: string) {
    // Initialize PostgreSQL connection pool
  }

  async initialize(): Promise<void> {
    // Run migrations, create tables
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        wallet_id UUID PRIMARY KEY,
        addresses JSONB NOT NULL,
        encrypted_keys JSONB NOT NULL,
        fiat_customer_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY,
        wallet_id UUID REFERENCES wallets(wallet_id),
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        source_currency VARCHAR(10),
        target_currency VARCHAR(10),
        source_amount VARCHAR(50),
        target_amount VARCHAR(50),
        fee VARCHAR(50),
        fee_currency VARCHAR(10),
        network VARCHAR(50),
        tx_hash VARCHAR(255),
        bank_transfer_id VARCHAR(255),
        contract_address VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS bank_accounts (
        id UUID PRIMARY KEY,
        wallet_id UUID REFERENCES wallets(wallet_id),
        fiat_provider_bank_id VARCHAR(255),
        masked_iban VARCHAR(255),
        bank_name VARCHAR(255),
        currency VARCHAR(3),
        status VARCHAR(50) DEFAULT 'LINKED',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
      CREATE INDEX idx_transactions_status ON transactions(status);
    `);
  }

  async saveWallet(wallet: StoredWallet): Promise<void> {
    await this.pool.query(
      `INSERT INTO wallets (wallet_id, addresses, encrypted_keys, fiat_customer_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [wallet.walletId, JSON.stringify(wallet.addresses), JSON.stringify(wallet.encryptedKeys),
       wallet.fiatCustomerId, wallet.createdAt, wallet.updatedAt],
    );
  }

  async getWallet(walletId: string): Promise<StoredWallet | null> {
    const result = await this.pool.query(
      'SELECT * FROM wallets WHERE wallet_id = $1', [walletId],
    );
    return result.rows[0] ? this.mapWalletRow(result.rows[0]) : null;
  }

  // ... implement remaining methods

  async destroy(): Promise<void> {
    await this.pool.end();
  }
}
```

## Publishing Your Provider

1. Name your package following the convention:
   - Blockchain: `@open-wallet/network-<name>`
   - Fiat: `@open-wallet/regional-<name>`
   - Storage: `@open-wallet/storage-<name>`

2. Export your class as default:

```typescript
export { MyProvider } from './my-provider';
export type { MyProviderConfig } from './types';
```

3. Add `@open-wallet/types` as a peer dependency

4. Publish to npm with the `open-wallet` keyword
