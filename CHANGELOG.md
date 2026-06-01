# Changelog

All notable changes to Argos Wallet will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
