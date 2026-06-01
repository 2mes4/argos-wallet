<p align="center">
  <img src="web/public/argos-logo.svg" width="120" alt="Argos Wallet" />
</p>

<h1 align="center">
  <strong>Argos Wallet</strong>
</h1>

<p align="center">
  <em>The all-seeing wallet infrastructure for Web3 applications.</em>
</p>

<p align="center">
  <a href="#status"><img src="https://img.shields.io/badge/status-alpha-orange" alt="Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-BSL%201.1-blue" alt="License" /></a>
  <a href="https://golang.org"><img src="https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go" alt="Go" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" /></a>
  <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" alt="PostgreSQL" /></a>
</p>

---

> **Argos Panoptes** — the hundred-eyed giant of Greek mythology who never slept, always watching. We named this project Argos because that's exactly what a wallet platform should do: watch your assets across every chain, never blink, never miss a transaction.

## What is Argos?

Argos is a **self-hosted, multi-tenant wallet infrastructure platform** for Web3 applications. It provides everything you need to offer custodial wallets to your users — wallet creation, transaction signing, automated routing rules, identity verification, and multi-chain support — through a single API and dashboard.

**You deploy it. You own the keys. You control everything.**

### What can you build with it?

- **Fintech apps** that need crypto wallets for each user
- **NFT platforms** that need automated royalty splits
- **Gaming platforms** that need in-game currency wallets
- **DAOs** that need treasury management with routing rules
- **Any Web3 app** that needs wallet infrastructure without building it from scratch

---

## Features

| Feature | Description |
|---|---|
| **Multi-tenant** | Each application gets its own isolated PostgreSQL schema. Complete data separation. |
| **Multi-chain** | Ethereum, Polygon, Base, Arbitrum — add any EVM chain in minutes. |
| **Server-side signing** | Private keys never leave the server. Derive, sign, transact — all server-side. |
| **Routing Rules** | Automate sweeps, splits, forwards, and fiat offramps with condition-based rules. |
| **Identity** | Sign and verify messages for authentication flows. |
| **External Wallets** | Link MetaMask, WalletConnect, and other external wallets to user accounts. |
| **Dashboard** | Beautiful management UI for wallets, transactions, rules, and API keys. |
| **SDKs** | Go, TypeScript, and Dart SDKs for integration from any stack. |
| **Real-time** | Firebase Firestore integration for live transaction updates (optional). |
| **Production-ready** | Docker, K3s manifests, CI/CD, health checks, rate limiting — all included. |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Argos Platform                     │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Next.js │  │  Go API  │  │  Background Jobs  │  │
│  │ Dashboard│──│ (chi)    │──│  tx_monitor       │  │
│  │ :3000    │  │ :8080    │  │  balance_sync     │  │
│  └──────────┘  └────┬─────┘  │  rule_evaluator   │  │
│                     │         │  sweep_executor   │  │
│                     │         └───────────────────┘  │
│              ┌──────┴──────┐                         │
│              │ PostgreSQL  │                         │
│              │ schema-per- │                         │
│              │   tenant    │                         │
│              └─────────────┘                         │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│              EVM RPC Layer                        │   │
│  Ethereum │ Polygon │ Base │ Arbitrum │ ...      │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Go 1.22, chi router, pgx/v5, zerolog |
| **Frontend** | Next.js 14, React 18, Tailwind CSS, Framer Motion |
| **Database** | PostgreSQL 16 with schema-per-tenant isolation |
| **Blockchain** | go-ethereum, supports any EVM chain |
| **Infrastructure** | Docker, K3s, Cloudflare, Firebase (optional) |
| **SDKs** | Go, TypeScript, Dart |

---

## Quick Start

### Prerequisites

- Go 1.22+
- Node.js 18+
- PostgreSQL 14+
- Make

### 1. Start PostgreSQL

```bash
brew install postgresql@16
brew services start postgresql@16
createdb argos
```

### 2. Start the Backend

```bash
cd platform

# Set environment
export DATABASE_URL="postgres://$(whoami)@localhost:5432/argos?sslmode=disable"
export RUN_MIGRATIONS=true

# Run
go run ./cmd/server
```

The API starts at `http://localhost:8080`.

### 3. Start the Dashboard

```bash
cd web
npm install
npm run dev
```

The dashboard opens at `http://localhost:3000`.

### 4. Create Your First App

1. Open `http://localhost:3000` — you'll be redirected to the login page
2. Enter your application name and click **Create Application**
3. Save your API key (shown once)
4. You're in the dashboard — create wallets, set up routing rules, and start building

### Verify it works

```bash
# Health check
curl http://localhost:8080/v1/health
# → {"status":"ok","version":"0.1.0","service":"argos-wallet"}

# Register an app via API
curl -X POST http://localhost:8080/v1/tenants/register \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'
# → {"tenant": {...}, "api_key": {"api_key": "argos_..."}}

# Create a wallet
curl -X POST http://localhost:8080/v1/wallets \
  -H "Authorization: Bearer argos_..." \
  -H "Content-Type: application/json" \
  -d '{"external_id": "user-1", "networks": ["polygon"]}'
```

---

## Project Structure

```
argos-wallet/
├── platform/              # Go backend (multi-tenant wallet infrastructure)
│   ├── cmd/
│   │   ├── server/        # HTTP API server
│   │   └── worker/        # Background job worker
│   ├── internal/
│   │   ├── blockchain/    # EVM + Solana + ERC-4337
│   │   ├── config/        # Environment configuration
│   │   ├── database/      # PostgreSQL connection + migrations
│   │   ├── domain/        # Core domain models
│   │   ├── firebase/      # Firestore real-time sync
│   │   ├── handler/       # HTTP handlers (wallet, tx, routing, identity, webhook)
│   │   ├── middleware/    # API key auth, rate limiting
│   │   ├── repository/    # Database queries (pgx)
│   │   ├── service/       # Business logic (wallet, tx, routing, webhook, multisig, paymaster, hardware)
│   │   ├── vault/         # HashiCorp Vault client
│   │   └── worker/        # Background jobs
│   └── tests/integration/ # Integration tests
│
├── web/                   # Next.js dashboard
│   └── src/
│       ├── app/           # App router pages (login, dashboard)
│       ├── components/    # Logo, shared UI
│       └── lib/           # API client, utilities
│
├── sdks/                  # Official SDKs
│   ├── go/                # Go SDK
│   ├── typescript/        # TypeScript SDK (@argos-wallet/sdk)
│   └── dart/              # Dart SDK (argos_wallet)
│
├── packages/              # TypeScript monorepo packages
│   ├── core/              # @argos-wallet/core — engine, wallet/tx orchestration
│   ├── types/             # @argos-wallet/types — shared interfaces
│   ├── react/             # @argos-wallet/react — hooks + components
│   ├── ui/                # @argos-wallet/ui — Lit Web Components
│   ├── network-evm/       # @argos-wallet/network-evm — generic EVM provider
│   ├── network-ethereum/  # @argos-wallet/network-ethereum
│   ├── network-polygon/   # @argos-wallet/network-polygon
│   ├── network-base/      # @argos-wallet/network-base
│   ├── regional-americas/ # @argos-wallet/regional-americas — ACH, SPEI, Stripe
│   ├── regional-sepa/     # @argos-wallet/regional-sepa — Monerium, Stripe
│   ├── storage-memory/    # @argos-wallet/storage-memory
│   ├── connector-metamask/     # @argos-wallet/connector-metamask
│   ├── connector-walletconnect/ # @argos-wallet/connector-walletconnect
│   └── flutter/           # argos_wallet_flutter — Flutter widgets
│
├── apps/example/          # Vite + Web Components example app
│
├── infra/                 # Infrastructure
│   ├── k3s/               # Kubernetes manifests
│   ├── scripts/           # Deploy scripts
│   └── firebase/          # Firestore rules + config
│
├── docs/                  # Architecture, API reference, guides
│   ├── architecture/      # System architecture
│   ├── api/               # SDK API reference
│   ├── api-reference/     # REST API reference
│   ├── getting-started/   # Installation guides
│   ├── deployment/        # Production deployment
│   └── ...                # UI components, React/Flutter SDKs
│
├── LICENSE                # BSL 1.1
├── CONTRIBUTING.md
└── README.md
```

---

## API Reference

### Authentication

All requests require an API key in the `Authorization` header:

```
Authorization: Bearer argos_your_api_key_here
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/tenants/register` | Register a new application |
| `POST` | `/v1/wallets` | Create a wallet |
| `GET` | `/v1/wallets/:id` | Get wallet details |
| `GET` | `/v1/wallets/:id/addresses` | List wallet addresses |
| `DELETE` | `/v1/wallets/:id` | Deactivate wallet |
| `POST` | `/v1/wallets/:id/connections` | Link external wallet |
| `GET` | `/v1/wallets/:id/connections` | List external wallets |
| `DELETE` | `/v1/wallets/:id/connections/:cid` | Unlink external wallet |
| `GET` | `/v1/transactions` | List transactions |
| `POST` | `/v1/transactions/transfer` | Create crypto transfer |
| `POST` | `/v1/transactions/fiat-to-crypto` | Fiat → Crypto |
| `POST` | `/v1/transactions/crypto-to-fiat` | Crypto → Fiat |
| `POST` | `/v1/routing/rules` | Create routing rule |
| `GET` | `/v1/routing/rules?wallet_id=` | List rules |
| `POST` | `/v1/routing/rules/:id/execute` | Execute rule manually |
| `DELETE` | `/v1/routing/rules/:id` | Delete rule |
| `GET` | `/v1/routing/rules/:id/executions` | List rule executions |
| `POST` | `/v1/identity/sign-message` | Sign message with wallet key |
| `POST` | `/v1/identity/verify-signature` | Verify a signature |

See [docs/api-reference/reference.md](docs/api-reference/reference.md) for detailed request/response schemas.

---

## Deployment

### Docker

```bash
docker build -t argos-wallet ./platform
docker run -p 8080:8080 \
  -e DATABASE_URL="postgres://user:pass@db:5432/argos" \
  -e RUN_MIGRATIONS=true \
  argos-wallet
```

### K3s / Kubernetes

```bash
kubectl apply -f infra/k3s/base/
```

See [infra/k3s/base/](infra/k3s/base/) for manifests including:
- Namespace, PostgreSQL StatefulSet
- API server Deployment + Service
- Worker Deployment
- Ingress with TLS

---

## Testing

```bash
# Create test database
createdb argos_test

# Run all integration tests
cd platform
go test ./tests/integration/ -v -count=1
```

All 22 tests pass covering: tenant registration, wallet CRUD, external wallet linking, routing rules (create/list/delete/execute), identity signing/verification, transactions, multi-tenant isolation, and the full end-to-end workflow.

---

## License — Business Source License 1.1

Argos Wallet is **open-source** under the [Business Source License 1.1](LICENSE).

### What you CAN do (Change Date: January 1, 2028)

**Until the Change Date**, you may use Argos Wallet freely for:
- Internal development and testing
- Personal projects
- Educational purposes
- Contributing back to the project

### What you CANNOT do without a commercial license

Until the Change Date, you **may not** offer Argos Wallet as a **hosted/cloud service** to third parties. This means:

- **No SaaS** — You can't host Argos and sell wallet accounts to others
- **No managed service** — You can't offer "Argos-as-a-Service"
- **No reselling** — You can't bundle Argos into a product you sell hosted

### What you CAN do

- **Self-host** Argos for your own applications and users
- **Build products** on top of Argos that you offer to your customers
- **Use it internally** in your company for any number of users

### After the Change Date (January 1, 2028)

The license automatically converts to **MIT/Apache 2.0**, removing all restrictions.

### Why BSL?

We want Argos to be open-source (you can read every line, self-host, modify, contribute) while preventing cloud providers from packaging our work into a competing hosted product. This model is used by [Sentry](https://github.com/getsentry/sentry), [CockroachDB](https://github.com/cockroachdb/cockroach), [HashiCorp](https://www.hashicorp.com/license-faq), and many others.

### Commercial License

Need to offer Argos as a hosted service? Contact us for a commercial license: `eric@2mes4.com`

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas where we need help

- Non-EVM chain support (Solana, Bitcoin, NEAR)
- Wallet abstraction (Account Abstraction / ERC-4337)
- Additional language SDKs (Python, Ruby, Rust)
- Dashboard improvements (charts, analytics, dark/light toggle)
- Documentation translations

---

## Roadmap

- [x] Multi-tenant wallet creation (Polygon, Ethereum, Base)
- [x] Server-side signing and transactions
- [x] Routing rules (sweep, split, forward, fiat offramp)
- [x] External wallet linking (MetaMask, WalletConnect)
- [x] Identity signing for authentication
- [x] Dashboard UI with app registration flow
- [x] SDKs (Go, TypeScript, Dart)
- [x] Multi-tenant schema isolation
- [x] **Webhook system** for transaction events with HMAC signatures
- [x] **Firebase Firestore** real-time sync
- [x] **Vault-backed key management** (HashiCorp Vault)
- [x] **Gas sponsorship / paymaster** framework (ERC-4337)
- [x] **Solana support** (address derivation, signing, RPC)
- [x] **Account Abstraction (ERC-4337)** smart accounts
- [x] **Multi-sig wallets** (Gnosis Safe compatible)
- [x] **Hardware wallet** integration framework (Ledger, Trezor)
- [ ] Native mobile SDKs (Swift, Kotlin)
- [ ] Bitcoin support
- [ ] Zero-knowledge proof identity
- [ ] Cross-chain bridge integration
- [ ] Advanced analytics dashboard

---

## Credits

Built by [Eric](https://github.com/2mes4) with the hundred eyes of Argos watching.

**Greek mythology reference**: Argus Panoptes (Ἄργος Πανόπτης) was a giant with 100 eyes. Even when some eyes rested, others remained open, watching. After his death, Hera placed his eyes on the tail of the peacock. We like to think Argos Wallet carries the same spirit — always watching, across every chain, never sleeping.

---

<p align="center">
  <em>Self-hosted. Server-signed. Hundred-eyed.</em>
</p>
