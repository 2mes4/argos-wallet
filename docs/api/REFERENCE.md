# API Reference

## Argos Class

Main entry point for the SDK.

```typescript
import { Argos } from '@argos-wallet/core';
```

### Constructor

```typescript
new Argos(config: ArgosConfig)
```

**ArgosConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `storage` | `IStorageProvider` | Yes | Storage backend |
| `networks` | `IBlockchainProvider[]` | No | Blockchain providers |
| `fiat` | `IFiatProvider` | No | Fiat gateway provider |

---

## Wallet Operations

Accessed via `sdk.wallets.*`

### `createWallet()`

Creates a new multi-chain wallet with addresses on all configured networks.

```typescript
const wallet = await sdk.wallets.createWallet();
```

**Returns:** `Promise<MultiChainWallet>`

```typescript
interface MultiChainWallet {
  walletId: string;
  addresses: Record<string, string>; // { "polygon": "0x...", "base": "0x..." }
  createdAt: Date;
}
```

---

### `getWallet(walletId)`

Retrieves wallet info including balances and linked bank accounts.

```typescript
const info = await sdk.wallets.getWallet('wallet-uuid');
```

**Returns:** `Promise<WalletInfo>`

```typescript
interface WalletInfo {
  walletId: string;
  addresses: Record<string, string>;
  balances: WalletBalance[];
  linkedBanks: BankAccountDetails[];
  createdAt: Date;
}
```

---

### `getBalance(walletId, network, token)`

Gets the balance of a specific token on a specific network.

```typescript
const balance = await sdk.wallets.getBalance('wallet-id', 'polygon', 'USDC');
// "100.50"
```

**Returns:** `Promise<string>` (decimal string)

---

### `getAllBalances(walletId)`

Gets all balances across all configured networks.

```typescript
const balances = await sdk.wallets.getAllBalances('wallet-id');
```

**Returns:** `Promise<WalletBalance[]>`

```typescript
interface WalletBalance {
  network: string;
  token: string;
  balance: string;
  balanceUSD?: string;
  decimals: number;
}
```

---

### `signMessage(walletId, network, message)`

Signs an arbitrary message with the wallet's private key.

```typescript
const signature = await sdk.wallets.signMessage('wallet-id', 'polygon', 'Hello World');
```

**Returns:** `Promise<string>` (hex signature)

---

## Transaction Operations

Accessed via `sdk.transactions.*`

### `initiateFiatToCrypto(params)`

Starts an on-ramp transaction (bank to crypto).

```typescript
const tx = await sdk.transactions.initiateFiatToCrypto({
  walletId: 'wallet-uuid',
  bankAccountId: 'bank-account-id',
  amount: '100.00',
  sourceCurrency: 'EUR',
  targetCrypto: 'USDC',
  network: 'polygon',
});
```

**Params:** `CreateFiatToCryptoParams`

**Returns:** `Promise<InternalTransaction>`

---

### `initiateCryptoToFiat(params)`

Starts an off-ramp transaction (crypto to bank).

```typescript
const tx = await sdk.transactions.initiateCryptoToFiat({
  walletId: 'wallet-uuid',
  network: 'polygon',
  cryptoSymbol: 'USDC',
  amount: '50.00',
  targetCurrency: 'EUR',
  targetBankAccountId: 'bank-account-id',
});
```

**Params:** `CreateCryptoToFiatParams`

**Returns:** `Promise<InternalTransaction>`

---

### `initiateCryptoTransfer(params)`

Transfers crypto to an external address.

```typescript
const tx = await sdk.transactions.initiateCryptoTransfer({
  walletId: 'wallet-uuid',
  network: 'polygon',
  cryptoSymbol: 'USDC',
  amount: '25.00',
  toAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
});
```

**Params:** `CreateCryptoTransferParams`

**Returns:** `Promise<InternalTransaction>`

---

### `initiateSmartContractCall(params)`

Executes a smart contract method.

```typescript
const tx = await sdk.transactions.initiateSmartContractCall({
  walletId: 'wallet-uuid',
  network: 'polygon',
  contractAddress: '0xContract...',
  abi: ERC20_ABI,
  method: 'approve',
  args: ['0xSpender...', '1000000'],
  value: '0',
});
```

**Params:** `CreateSmartContractParams`

**Returns:** `Promise<InternalTransaction>`

---

### `getTransaction(transactionId)`

Gets transaction details.

```typescript
const tx = await sdk.transactions.getTransaction('tx-uuid');
```

---

### `listTransactions(walletId, filters?)`

Lists transactions for a wallet with optional filters.

```typescript
const txs = await sdk.transactions.listTransactions('wallet-id', {
  type: 'CRYPTO_TRANSFER',
  status: 'COMPLETED',
  network: 'polygon',
  from: new Date('2024-01-01'),
  limit: 10,
  offset: 0,
});
```

**Filters:** `TransactionFilters`

```typescript
interface TransactionFilters {
  type?: TransactionType;
  status?: TransactionStatus;
  network?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}
```

---

### `cancelTransaction(transactionId)`

Cancels a transaction that is still in INITIATED or FIAT_PENDING status.

```typescript
const tx = await sdk.transactions.cancelTransaction('tx-uuid');
```

---

### `onTransactionStatusChange(transactionId, callback)`

Listens for status changes on a specific transaction.

```typescript
const unsub = sdk.transactions.onTransactionStatusChange('tx-uuid', (tx) => {
  console.log(`Status: ${tx.status}`);
});

// Stop listening
unsub();
```

**Returns:** `() => void` (unsubscribe function)

---

### `onWalletTransaction(walletId, callback)`

Listens for all transaction events on a wallet.

```typescript
const unsub = sdk.transactions.onWalletTransaction('wallet-id', (tx) => {
  console.log(`${tx.type}: ${tx.status}`);
});

unsub();
```

**Returns:** `() => void`

---

## InternalTransaction Type

All transaction methods return this type:

```typescript
interface InternalTransaction {
  id: string;
  walletId: string;
  type: 'FIAT_TO_CRYPTO' | 'CRYPTO_TO_FIAT' | 'CRYPTO_TRANSFER' | 'SMART_CONTRACT_CALL';
  status: 'INITIATED' | 'FIAT_PENDING' | 'CRYPTO_PENDING' | 'CONFIRMING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  targetAmount: string;
  fee: string;
  feeCurrency: string;
  network: string;
  txHash?: string;
  bankTransferId?: string;
  contractAddress?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

## Error Types

```typescript
import {
  ArgosError,
  WalletNotFoundError,
  ProviderNotConfiguredError,
  TransactionFailedError,
  InsufficientBalanceError,
  NetworkNotSupportedError,
} from '@argos-wallet/core';
```

| Error | Code | Description |
|-------|------|-------------|
| `WalletNotFoundError` | `WALLET_NOT_FOUND` | Wallet ID does not exist |
| `ProviderNotConfiguredError` | `PROVIDER_NOT_CONFIGURED` | Network or fiat provider not registered |
| `TransactionFailedError` | `TRANSACTION_FAILED` | Generic transaction failure |
| `InsufficientBalanceError` | `INSUFFICIENT_BALANCE` | Not enough tokens for transfer |
| `NetworkNotSupportedError` | `NETWORK_NOT_SUPPORTED` | Network slug not found |

All errors extend `ArgosError` which has:
- `message: string` — Human-readable message
- `code: string` — Machine-readable error code
- `details?: unknown` — Additional context
