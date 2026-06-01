# React SDK — `@argos-wallet/react`

React hooks and components for integrating Argos Wallet into React 18+ applications. The SDK wraps the wallet REST API and provides ready-to-use UI components.

## Installation

```bash
npm install @argos-wallet/react
```

**Peer dependency:** React >= 18.0.0

## Hook: `useArgos`

The primary hook for interacting with the wallet API.

```tsx
import { useArgos } from '@argos-wallet/react';

function App() {
  const {
    walletId,
    balances,
    loading,
    error,
    fetchBalances,
    fetchTransactions,
    sendCrypto,
    fiatToCrypto,
    cryptoToFiat,
    linkExternal,
    getExternalConnections,
    unlinkExternal,
  } = useArgos(
    { apiUrl: 'https://api.example.com', authToken: 'user-jwt' },
    walletId,
  );
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `WalletApiConfig` | API URL and optional auth token |
| `walletId` | `string \| null` | Current wallet ID (pass `null` when not loaded) |

### WalletApiConfig

```typescript
interface WalletApiConfig {
  apiUrl: string;
  authToken?: string;
}
```

### Return Values

| Field | Type | Description |
|-------|------|-------------|
| `walletId` | `string \| null` | Current wallet ID |
| `balances` | `BalanceEntry[]` | Fetched balances (auto-loaded on mount) |
| `loading` | `boolean` | Loading state for balance fetch |
| `error` | `string \| null` | Last error message |
| `fetchBalances()` | `() => Promise<void>` | Refresh balances |
| `fetchTransactions(limit?)` | `(limit?: number) => Promise<TransactionEntry[]>` | Fetch transaction history |
| `sendCrypto(params)` | `(params) => Promise<TransactionEntry>` | Send crypto to address |
| `fiatToCrypto(params)` | `(params) => Promise<TransactionEntry>` | Bank → Crypto on-ramp |
| `cryptoToFiat(params)` | `(params) => Promise<TransactionEntry>` | Crypto → Bank off-ramp |
| `linkExternal(params)` | `(params) => Promise<ExternalConnection>` | Link external wallet |
| `getExternalConnections()` | `() => Promise<ExternalConnection[]>` | List linked wallets |
| `unlinkExternal(connectionId)` | `(id: string) => Promise<void>` | Unlink external wallet |

### Types

```typescript
interface BalanceEntry {
  network: string;
  token: string;
  balance: string;
  decimals: number;
}

interface TransactionEntry {
  id: string;
  type: string;
  status: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  network: string;
  createdAt: string;
  txHash?: string;
}

interface ExternalConnection {
  id: string;
  provider: string;
  address: string;
  chainId: number;
  connectedAt: string;
}
```

---

## Components

### `<WalletCard>`

Displays token balances in a card layout with filtering.

```tsx
import { WalletCard } from '@argos-wallet/react';

<WalletCard
  balances={balances}
  loading={false}
  error={null}
  supportedTokens={['USDC', 'EURC']}
  activeNetwork="polygon"
/>
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `balances` | `BalanceEntry[]` | Yes | Array of balance entries |
| `loading` | `boolean` | No | Show loading spinner |
| `error` | `string \| null` | No | Show error message |
| `supportedTokens` | `string[]` | No | Filter by token symbols (case-insensitive) |
| `activeNetwork` | `string` | No | Filter by network slug |

**States:**
- `loading` → Shows "Loading balances..." message
- `error` → Shows red error text
- Empty balances → Shows "No balances found"
- Normal → Card with token rows showing symbol, network, and formatted balance

**Data test IDs:** `wallet-card`, `wallet-card-loading`, `wallet-card-error`, `wallet-card-empty`, `balance-{TOKEN}-{NETWORK}`

---

### `<ConnectWalletButton>`

Button for connecting MetaMask and displaying connected address.

```tsx
import { ConnectWalletButton } from '@argos-wallet/react';

<ConnectWalletButton
  connected={false}
  address={null}
  onConnect={(address) => console.log('Connected:', address)}
  onDisconnect={() => console.log('Disconnected')}
/>
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onConnect` | `(address: string) => void` | No | Called with address when MetaMask connects |
| `onDisconnect` | `() => void` | No | Called when disconnect button is clicked |
| `connected` | `boolean` | No | Whether wallet is connected |
| `address` | `string` | No | Connected wallet address |

**Behavior:**
- Not connected → Shows "Connect MetaMask"
- Connected → Shows truncated address (e.g., `0x742d...bD18`)
- Connecting → Shows "Connecting..." and disables button
- No MetaMask → Opens MetaMask download page
- Error → Shows error message below button

**Data test IDs:** `connect-wallet-btn`, `connect-wallet-error`

---

### `<TransactionList>`

Displays a chronological list of transactions with type labels and status badges.

```tsx
import { TransactionList } from '@argos-wallet/react';

<TransactionList
  transactions={transactions}
  loading={false}
/>
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `transactions` | `TransactionEntry[]` | Yes | Array of transaction entries |
| `loading` | `boolean` | No | Show loading state |

**Type Labels:**

| Type | Label | Icon |
|------|-------|------|
| `FIAT_TO_CRYPTO` | Deposit | ↓ |
| `CRYPTO_TO_FIAT` | Withdrawal | ↑ |
| `CRYPTO_TRANSFER` | Transfer | → |
| `SMART_CONTRACT_CALL` | Contract Call | ⚡ |

**Data test IDs:** `tx-list`, `tx-list-loading`, `tx-list-empty`, `tx-{ID}`

---

## Full Example

```tsx
import React from 'react';
import {
  useArgos,
  WalletCard,
  ConnectWalletButton,
  TransactionList,
} from '@argos-wallet/react';

function WalletDashboard({ walletId }: { walletId: string }) {
  const { balances, loading, transactions, fetchTransactions } = useArgos(
    { apiUrl: '/api/v1', authToken: localStorage.getItem('jwt') || undefined },
    walletId,
  );

  const [connected, setConnected] = React.useState(false);
  const [address, setAddress] = React.useState<string | null>(null);

  return (
    <div>
      <h1>My Wallet</h1>

      <ConnectWalletButton
        connected={connected}
        address={address}
        onConnect={(addr) => { setConnected(true); setAddress(addr); }}
        onDisconnect={() => { setConnected(false); setAddress(null); }}
      />

      <WalletCard
        balances={balances}
        loading={loading}
        supportedTokens={['USDC', 'EURC', 'POL']}
      />

      <TransactionList transactions={transactions || []} />
    </div>
  );
}
```

---

## Testing

The React SDK includes 19 tests using Jest + React Testing Library + jsdom.

```bash
cd packages/react
npm test
```

**Test coverage:**
- `WalletCard` (6 tests) — renders balances, loading, error, empty, token filtering, network filtering
- `ConnectWalletButton` (6 tests) — connect/disconnect states, MetaMask integration, error handling, connecting state
- `TransactionList` (7 tests) — renders transactions, type labels, +/- amounts, status badges, loading, empty
