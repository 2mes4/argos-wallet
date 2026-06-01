# Changelog

All notable changes to Argos Wallet will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-06-01

### Added
- Webhook system with HMAC-SHA256 signing and delivery tracking
- HashiCorp Vault integration for key management (optional, falls back to env mnemonic)
- Solana blockchain support (ed25519 key derivation, RPC client, sign/verify)
- Account Abstraction / ERC-4337 (counterfactual addresses, UserOperations, bundler RPC)
- Multi-sig wallets (Gnosis Safe-compatible, threshold/owners, propose/confirm)
- Hardware wallet integration framework (Ledger, Trezor, GridPlus)
- Gas sponsorship / Paymaster framework with budget checking
- Firebase Firestore real-time sync (queue-based flush pattern)
- Event processor goroutine for webhooks + firestore sync
- `/v1/ready` health check endpoint
- Webhook CRUD API (`POST/GET/DELETE /v1/webhooks`)
- TypeScript monorepo packages: `@argos-wallet/core`, `types`, `react`, `ui` (Lit Web Components),
  `network-evm/ethereum/polygon/base`, `regional-americas/sepa`, `storage-memory`,
  `connector-metamask/walletconnect`
- Example app (`apps/example/`) — Vite + Web Components demo
- Flutter widget package (`packages/flutter/` — `argos_wallet_flutter`)
- K3s deployment scripts and Firebase config
- GitHub Actions CI (platform + SDKs)
- Integration and e2e test suites

### Changed
- API key prefix changed from `ow_` to `argos_`
- All branding updated from "Open Wallet" to "Argos Wallet"
- npm scope changed from `@open-wallet/*` to `@argos-wallet/*`
- Dart package renamed from `open_wallet` to `argos_wallet`
- Go module: `github.com/2mes4/argos-wallet/platform`
- React hook renamed from `useOpenWallet` to `useArgos`
- CSS custom properties prefix changed from `--ow-*` to `--argos-*`
- Custom element names: `<argos-card>`, `<argos-provider>`, etc.
- Server version bumped to 0.2.0
- License changed from MIT to BSL 1.1

## [0.1.0] - 2024-06-01

### Added
- Multi-tenant wallet creation with schema-per-tenant PostgreSQL isolation
- Server-side key derivation and signing (EVM chains)
- Multi-chain support: Ethereum, Polygon, Base, Arbitrum
- Wallet CRUD API (`POST/GET/DELETE /v1/wallets`)
- External wallet linking (MetaMask, WalletConnect)
- Transaction tracking with status monitoring
- Routing rules engine:
  - Sweep rules (auto-transfer on threshold)
  - Split rules (distribute funds by percentage)
  - Forward rules (relay to another wallet)
  - Fiat offramp rules
- Identity signing (`POST /v1/identity/sign-message`)
- Signature verification (`POST /v1/identity/verify-signature`)
- Background workers (tx_monitor, balance_sync, rule_evaluator, sweep_executor)
- Next.js dashboard with:
  - App registration and API key management
  - Wallet creation with network selection
  - Transaction history table
  - Routing rules CRUD with JSON editor
  - Identity signing tools
  - API key viewer
- SDKs:
  - Go SDK (`sdks/go/`)
  - TypeScript SDK (`sdks/typescript/`)
  - Dart SDK (`sdks/dart/`)
- Docker multi-stage build
- K3s/Kubernetes manifests (namespace, postgres, server, worker, ingress)
- 22 integration tests (100% pass rate)
- BSL 1.1 license with Change Date 2028-01-01

### Security
- API key authentication with SHA256 hashing
- Per-tenant schema isolation
- Rate limiting (100 requests/minute)
- CORS configuration
- Server-side key management (keys never exposed via API)
