---
name: argos-wallet
description: |
  AI skill for integrating the Argos Wallet platform into applications.
  Use when the user asks to "integrate argos-wallet", "add wallet", "create wallet api",
  "set up crypto payments", "link metamask", "routing rules", "sign message",
  or wants to connect their app to the Argos Wallet SaaS platform.
  Covers SDK usage in Go, TypeScript, and Dart/Flutter.
triggers:
  - argos-wallet
  - argoswallet
  - wallet sdk
  - create wallet api
  - integrate wallet
  - crypto wallet integration
  - link metamask
  - routing rules sweep
  - sign message identity
  - fiat on ramp
  - register tenant
---

# Argos Wallet Integration Skill

## What This Skill Does

This skill helps developers integrate the Argos Wallet SaaS platform into their applications using the open-source SDKs (Go, TypeScript/JavaScript, Dart/Flutter).

## Platform Overview

Argos Wallet is a multi-tenant SaaS wallet platform. The flow is:

1. **Register your app** as a tenant → get API key
2. **Install SDK** in your language (Go, TS, Dart)
3. **Create wallets** for your users → get multi-chain addresses
4. **Link external wallets** (MetaMask, WalletConnect)
5. **Sign messages** as identity
6. **Create routing rules** for automated money movement
7. **Transfer crypto** or **execute smart contracts**

## Quick Start

### 1. Register Your App

```bash
curl -X POST https://api.argoswallet.dev/v1/tenants/register \
  -H "Content-Type: application/json" \
  -d '{"name": "My App", "plan": "starter"}'
```

Save the `api_key` from the response.

### 2. Install SDK

**Go:**
```bash
go get github.com/2mes4/argos-wallet/sdks/go
```

**TypeScript/JavaScript:**
```bash
npm install @argos-wallet/sdk
```

**Dart/Flutter:**
```yaml
dependencies:
  argos_wallet: ^0.1.0
```

### 3. Initialize Client

**Go:**
```go
import argos "github.com/2mes4/argos-wallet/sdks/go"

client, _ := argos.NewClient(argos.Config{
    APIKey:  "argos_your_api_key",
    BaseURL: "https://api.argoswallet.dev",
})
```

**TypeScript:**
```typescript
import { Argos } from '@argos-wallet/sdk';

const client = new Argos({
  apiKey: 'argos_your_api_key',
  baseURL: 'https://api.argoswallet.dev',
});
```

**Dart:**
```dart
import 'package:argos_wallet/argos_wallet.dart';

final client = ArgosClient(WalletConfig(
  apiKey: 'argos_your_api_key',
  baseUrl: 'https://api.argoswallet.dev',
));
```

## Common Integration Patterns

### Pattern 1: Create a Wallet for a New User

When a user signs up in your app, create a wallet:

```typescript
const wallet = await client.wallets.create({
  externalId: user.id,  // your internal user ID
  networks: ['polygon', 'ethereum', 'base'],
});

// Save wallet.id to your database
await db.users.update(user.id, { walletId: wallet.id });

// wallet.addresses = { polygon: "0x...", ethereum: "0x...", base: "0x..." }
```

### Pattern 2: Link User's MetaMask Wallet

Let users connect their existing MetaMask:

```typescript
// After MetaMask gives you the address
const connection = await client.wallets.linkExternal(wallet.id, {
  provider: 'metamask',
  address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  chainId: 137,
});
```

### Pattern 3: Sign Message as Identity

Use the wallet to sign authentication challenges:

```typescript
// 1. User wants to authenticate to a dApp
const challenge = "Sign this message to login: " + nonce;

// 2. Sign with Argos Wallet
const { signature, address } = await client.identity.signMessage(
  wallet.id,
  challenge
);

// 3. The dApp verifies the signature comes from the wallet address
```

### Pattern 4: Auto-Sweep Incoming Funds

When users receive crypto, auto-sweep to a treasury wallet:

```typescript
const sweepRule = await client.routing.createRule({
  walletId: userWallet.id,
  name: 'Auto-sweep to treasury',
  type: 'sweep',
  conditions: {
    network: 'polygon',
    token: 'USDC',
    threshold: '100',      // sweep when balance > 100 USDC
    trigger: 'on_receive', // trigger on incoming funds
  },
  actions: {
    targetType: 'wallet',
    targetWalletId: treasuryWallet.id,
    amount: 'all',         // sweep everything above threshold
    keepMinimum: '10',     // keep 10 USDC in user wallet
  },
});
```

### Pattern 5: Split Revenue

Split incoming payments 70/30:

```typescript
const splitRule = await client.routing.createRule({
  walletId: paymentWallet.id,
  name: 'Revenue split',
  type: 'split',
  conditions: {
    network: 'polygon',
    token: 'USDC',
    trigger: 'on_receive',
  },
  actions: {
    destinations: [
      { targetWalletId: partnerWallet.id, percentage: 30 },
      { targetWalletId: companyWallet.id, percentage: 70 },
    ],
  },
});
```

### Pattern 6: Forward Everything

Forward all incoming funds to another wallet:

```typescript
const forwardRule = await client.routing.createRule({
  walletId: tempWallet.id,
  name: 'Forward all',
  type: 'forward',
  conditions: {
    network: 'polygon',
    token: 'USDC',
    trigger: 'on_receive',
  },
  actions: {
    targetWalletId: mainWallet.id,
  },
});
```

### Pattern 7: Auto Fiat Off-ramp

Automatically convert crypto to fiat when threshold reached:

```typescript
const offrampRule = await client.routing.createRule({
  walletId: wallet.id,
  name: 'Weekly EUR withdrawal',
  type: 'fiat_offramp',
  conditions: {
    network: 'polygon',
    token: 'USDC',
    threshold: '1000',
    trigger: 'scheduled',
    schedule: '0 9 * * 1', // every Monday at 9am
  },
  actions: {
    targetCurrency: 'EUR',
    targetBankAccountId: 'bank_123',
    amount: 'all_above_threshold',
  },
});
```

## API Reference Quick Lookup

| Action | Method | Endpoint |
|--------|--------|----------|
| Create wallet | POST | /v1/wallets |
| Get wallet | GET | /v1/wallets/{id} |
| Get balances | GET | /v1/wallets/{id}/balances |
| Link external | POST | /v1/wallets/{id}/connections |
| Transfer crypto | POST | /v1/transactions/transfer |
| Fiat deposit | POST | /v1/transactions/fiat-to-crypto |
| Fiat withdrawal | POST | /v1/transactions/crypto-to-fiat |
| Smart contract | POST | /v1/transactions/contract-call |
| List transactions | GET | /v1/transactions?wallet_id= |
| Create rule | POST | /v1/routing/rules |
| Execute rule | POST | /v1/routing/rules/{id}/execute |
| Sign message | POST | /v1/identity/sign-message |
| Verify signature | POST | /v1/identity/verify-signature |

## When Helping Users

1. **Always start with registration** — check if they have an API key
2. **Ask about their stack** — Go, TypeScript, or Dart/Flutter
3. **Map their use case to patterns** — use the patterns above
4. **Security first** — never expose API keys in client-side code
5. **Test with small amounts** — always test on testnets first
6. **Explain routing rules** — many users don't know they can automate money movement

## Key Files in the Repo

- `platform/internal/handler/` — API endpoint implementations
- `platform/internal/service/` — Business logic
- `platform/internal/domain/` — Data models
- `sdks/go/` — Go SDK
- `sdks/typescript/packages/sdk/src/` — TypeScript SDK
- `sdks/dart/lib/` — Dart SDK
- `tests/integration/` — Integration tests
- `docs/docs/` — Documentation
- `infra/k3s/` — Kubernetes manifests
