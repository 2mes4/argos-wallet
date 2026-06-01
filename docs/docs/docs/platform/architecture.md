# Open Wallet Platform — Architecture

## Overview

Open Wallet is a **multi-tenant SaaS platform** that provides wallet infrastructure as a service. Applications register as tenants, receive an API key, and use one of the open-source SDKs (Go, TypeScript, Dart) to integrate wallet functionality into their products.

## Core Concepts

### Tenant
A tenant is a registered application/platform. Each tenant gets:
- An API key for authentication
- An isolated PostgreSQL schema (`tenant_{slug}`)
- Configurable networks, rate limits, and fiat providers
- Multiple API keys with different permissions

### Wallet
A wallet is the primary entity. Each wallet has:
- A UUID (`wallet_id`) — internal to the platform
- An optional `external_id` — the tenant's internal user reference
- Multi-chain addresses (Polygon, Ethereum, Base)
- External wallet connections (MetaMask, WalletConnect, etc.)
- Balances across networks and tokens

### Routing Rules
Rules that automatically move funds based on conditions:
- **Sweep**: Move funds above a threshold to another wallet
- **Split**: Distribute funds by percentage to multiple wallets
- **Forward**: Send all incoming funds to a target wallet
- **Fiat Offramp**: Auto-convert crypto to fiat and send to bank

### Identity
Wallets can sign messages and transactions as identity:
- Server-side signing (keys never leave the platform)
- Message signing for authentication/authorization
- Smart contract execution

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                      │
│                                                             │
│   Web (React)    Mobile (Flutter)    Backend (Go/Node)     │
│        │               │                   │                │
│        └───────────────┴───────────────────┘                │
│                     SDK (Go / TS / Dart)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS REST API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    OPEN WALLET PLATFORM                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                API Server (Go)                       │   │
│  │                                                      │   │
│  │  Auth Middleware → Tenant Resolution → Rate Limit    │   │
│  │                                                      │   │
│  │  /v1/wallets/*      → WalletService                  │   │
│  │  /v1/transactions/* → TransactionService             │   │
│  │  /v1/routing/*      → RoutingService                 │   │
│  │  /v1/identity/*     → IdentityService                │   │
│  │  /v1/tenants/*      → TenantService                  │   │
│  └──────────────────────────┬──────────────────────────┘   │
│                             │                               │
│  ┌──────────────────────────┴──────────────────────────┐   │
│  │                Worker (Go)                           │   │
│  │                                                      │   │
│  │  - Transaction Monitor   - Balance Sync              │   │
│  │  - Rule Evaluator        - Sweep Executor            │   │
│  └──────────────────────────┬──────────────────────────┘   │
│                             │                               │
│  ┌────────────┐  ┌─────────┴──────────┐  ┌────────────┐  │
│  │ PostgreSQL │  │   Vault (Secrets)   │  │  Firebase  │  │
│  │ Schema/    │  │   - Mnemonics       │  │  - Auth    │  │
│  │ Tenant     │  │   - API Keys        │  │  - Store   │  │
│  └────────────┘  └─────────────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Multi-Tenancy Model

Each tenant has an isolated PostgreSQL schema. When a request comes in:

1. API key is validated against `tenant_api_keys` table
2. Tenant's schema is resolved from `tenants.schema_name`
3. All queries are executed with `SET search_path = tenant_{slug}, public`
4. Complete data isolation between tenants

```
PostgreSQL Instance
├── public (platform tables)
│   ├── tenants
│   └── tenant_api_keys
├── tenant_acme_corp_abc123
│   ├── wallets
│   ├── wallet_addresses
│   ├── transactions
│   ├── routing_rules
│   └── rule_executions
├── tenant_globex_def456
│   ├── wallets
│   ├── transactions
│   └── ...
```

## Request Flow

```
1. Client sends request with API key header
2. Middleware validates API key (bcrypt compare)
3. Tenant resolved → schema identified
4. Request handler executes in tenant's schema
5. Response returned to client
6. Events published to internal event bus
7. Worker processes background jobs
```

## Security Model

- **Server-side signing**: Private keys are derived from mnemonics stored in Vault, never exposed to clients
- **API key authentication**: Bcrypt-hashed keys, per-tenant rate limiting
- **Schema isolation**: Each tenant's data is in a separate PostgreSQL schema
- **Firestore rules**: Real-time data is protected by Firebase Auth + tenant claims
- **Vault**: Mnemonics and signing keys are stored in HashiCorp Vault

## Deployment

- **K3s**: Single-node Kubernetes cluster
- **Server**: 2 replicas, auto-scaled
- **Worker**: 1 replica, background processing
- **PostgreSQL**: StatefulSet with 20Gi persistent volume
- **Vault**: StatefulSet with auto-unseal (dev) or Shamir (production)
- **Ingress**: Traefik with TLS via cert-manager
