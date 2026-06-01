# Architecture Overview

## Design Principles

### 1. Headless by Default

The SDK separates business logic from presentation. The core engine (`@argos-wallet/core`) has zero UI dependencies and can run in any Node.js environment. The UI components (`@argos-wallet/ui`) are an optional layer.

### 2. Plugin Architecture

Every external system is accessed through well-defined interfaces:

```
IBlockchainProvider  →  Blockchain networks
IFiatProvider        →  Banking/payment gateways
IStorageProvider     →  Database/persistence layer
```

This means you can:
- Swap Polygon for Solana without changing business logic
- Switch from Monerium to Stripe without touching the UI
- Use PostgreSQL instead of in-memory storage with zero code changes

### 3. Wallet-ID Centric

The SDK uses `wallet_id` (not `user_id`) as its primary identifier:

```
Your App                     Argos Wallet SDK
┌──────────────┐            ┌──────────────────┐
│ users        │            │ wallets          │
│ - id (PK)    │──wallet_id─│ - walletId (PK)  │
│ - email      │            │ - addresses{}    │
│ - wallet_id  │            │ - encryptedKeys  │
└──────────────┘            └──────────────────┘
```

Benefits:
- **GDPR compliance** — The SDK stores no PII
- **Multi-wallet support** — One user can have multiple wallets
- **Framework agnostic** — Works with any auth system

## Core Components

### WalletEngine

Manages the lifecycle of multi-chain wallets:

```
WalletEngine
├── createWallet()        → Generates HD addresses on all configured networks
├── getWallet()           → Returns wallet info + balances
├── getBalance()          → Queries specific token balance
├── getAllBalances()      → Queries all balances across all networks
├── signMessage()         → Signs arbitrary messages
└── registerNetworkProvider()  → Adds blockchain support
```

### TransactionEngine

Orchestrates complex multi-step transactions:

```
TransactionEngine
├── initiateFiatToCrypto()      → Bank → Crypto (on-ramp)
├── initiateCryptoToFiat()      → Crypto → Bank (off-ramp)
├── initiateCryptoTransfer()    → Wallet → Wallet
├── initiateSmartContractCall() → Execute contract methods
├── onTransactionStatusChange() → Real-time status updates
└── onWalletTransaction()       → All transactions for a wallet
```

### EventBus

Internal pub/sub system that powers real-time updates:

```
EventBus
├── wallet:created           → New wallet created
├── transaction:created      → New transaction initiated
├── transaction:status_change → Status update (PENDING → CONFIRMING → COMPLETED)
├── transaction:completed    → Transaction succeeded
└── transaction:failed       → Transaction failed
```

## Transaction Lifecycle

### On-Ramp (Fiat → Crypto)

```
User                  SDK                    Fiat Provider         Blockchain
 │                     │                         │                     │
 │──deposit request──→ │                         │                     │
 │                     │──createCustomer()────→  │                     │
 │                     │──requestBankDeposit()─→ │                     │
 │                     │←──instructions──────────│                     │
 │←──show IBAN/ref──── │                         │                     │
 │                     │                         │                     │
 │──(bank transfer)──────────────────────────→   │                     │
 │                     │                         │──(detect deposit)──→│
 │                     │                         │                     │──mint/transfer──→
 │                     │←──confirmed─────────────│                     │
 │←──balance updated── │                         │                     │
```

### Off-Ramp (Crypto → Fiat)

```
User                  SDK                    Blockchain           Fiat Provider
 │                     │                         │                     │
 │──withdraw request──→│                         │                     │
 │                     │──transferTokens()─────→ │                     │
 │                     │←──txHash─────────────── │                     │
 │                     │──(poll confirmation)──→ │                     │
 │                     │←──SUCCESS────────────── │                     │
 │                     │──triggerWithdrawal()──────────────────────→   │
 │                     │←──transferId──────────────────────────────   │
 │←──"processing"───── │                         │                     │
 │                     │                         │                     │
 │←──"completed"────── │←──COMPLETED─────────────────────────────   │
```

## Data Flow

### Server-Side (Node.js)

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  UI      │────→│  API Route  │────→│  Argos   │────→│  Blockchain  │
│ (Lit WC) │←────│ (Express/   │←────│  (Core SDK)   │←────│  Provider    │
│          │     │  Fastify)   │     │              │     │  (Viem)     │
└─────────┘     └──────┬──────┘     └──────┬───────┘     └─────────────┘
                       │                   │
                       │              ┌─────▼────────┐     ┌─────────────┐
                       │              │   Storage     │     │  Fiat        │
                       │              │  Provider     │     │  Provider    │
                       │              │  (Memory/DB)  │     │  (SEPA/ACH)  │
                       │              └──────────────┘     └─────────────┘
```

### Multi-Platform Frontend

The SDK provides three frontend integration paths that all communicate with the same REST API:

```
┌──────────────────────────────────────────────────────────────────┐
│                        REST API                                  │
│              /v1/wallets/{id}/balances                           │
│              /v1/wallets/{id}/transactions                       │
│              /v1/transactions/*                                   │
│              /v1/wallets/{id}/link-external                       │
└──────────┬──────────────┬──────────────┬─────────────────────────┘
           │              │              │
      ┌─────▼──────┐ ┌────▼──────┐ ┌────▼──────────┐
      │ Web Comps  │ │ React SDK │ │  Flutter SDK  │
      │  (Lit)     │ │ useArgos()│ │  WalletApi    │
      │            │ │           │ │  Service()    │
      │ @argos-    │ │ @argos-   │ │  argos_wallet  │
      │ wallet/ui  │ │ wallet/   │ │  (Dart)       │
      │            │ │ react     │ │               │
      └────────────┘ └───────────┘ └───────────────┘
     Any framework   React 18+    Flutter 3.5+
```

**Choosing a frontend SDK:**

| Platform | Package | When to Use |
|----------|---------|-------------|
| Web Components | `@argos-wallet/ui` | Multi-framework sites, plain HTML, SSR |
| React | `@argos-wallet/react` | React/Next.js apps — hooks for state management |
| Flutter | `argos_wallet` | iOS/Android native apps |
