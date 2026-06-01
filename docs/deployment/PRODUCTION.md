# Production Deployment Guide

## Server Setup

The Argos Wallet SDK runs on your server. You need to expose a REST API that your frontend components can communicate with.

### Recommended Stack

- **Runtime:** Node.js >= 18
- **Framework:** Fastify or Express
- **Storage:** PostgreSQL (via `@argos-wallet/storage-postgres` or custom `IStorageProvider`)
- **Cache:** Redis (for session/event bus in multi-instance setups)

### Example API Server (Fastify)

```typescript
import Fastify from 'fastify';
import { Argos } from '@argos-wallet/core';
import { MemoryStorage } from '@argos-wallet/storage-memory';
import { createPolygonProvider } from '@argos-wallet/network-polygon';
import { SepaFiatProvider } from '@argos-wallet/regional-sepa';

const app = Fastify();

const sdk = new Argos({
  storage: new MemoryStorage(), // Use PostgresStorage in production
  networks: [
    createPolygonProvider({
      mnemonic: process.env.MNEMONIC!,
      testnet: false,
      rpcUrl: process.env.POLYGON_RPC_URL,
    }),
  ],
  fiat: new SepaFiatProvider({
    gateway: 'monerium',
    apiKey: process.env.MONERIUM_API_KEY,
    apiSecret: process.env.MONERIUM_API_SECRET,
  }),
});

// Auth middleware (simplified)
app.addHook('onRequest', async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
  // Verify JWT and attach walletId to request
  // request.walletId = verifyJWT(token).walletId;
});

// Create wallet
app.post('/v1/wallets', async (request, reply) => {
  const wallet = await sdk.wallets.createWallet();
  return wallet;
});

// Get wallet info
app.get('/v1/wallets/:walletId', async (request) => {
  return sdk.wallets.getWallet(request.params.walletId);
});

// Get balances
app.get('/v1/wallets/:walletId/balances', async (request) => {
  return sdk.wallets.getAllBalances(request.params.walletId);
});

// Fiat to crypto
app.post('/v1/transactions/fiat-to-crypto', async (request) => {
  const body = request.body as any;
  return sdk.transactions.initiateFiatToCrypto(body);
});

// Crypto to fiat
app.post('/v1/transactions/crypto-to-fiat', async (request) => {
  const body = request.body as any;
  return sdk.transactions.initiateCryptoToFiat(body);
});

// Crypto transfer
app.post('/v1/transactions/crypto-transfer', async (request) => {
  const body = request.body as any;
  return sdk.transactions.initiateCryptoTransfer(body);
});

// Smart contract call
app.post('/v1/transactions/smart-contract', async (request) => {
  const body = request.body as any;
  return sdk.transactions.initiateSmartContractCall(body);
});

// Transaction history
app.get('/v1/wallets/:walletId/transactions', async (request) => {
  const { walletId } = request.params;
  return sdk.transactions.listTransactions(walletId, request.query as any);
});

app.listen({ port: 3000, host: '0.0.0.0' });
```

## Environment Variables

```env
# Required
MNEMONIC=your twelve word mnemonic phrase here

# Network RPC (use paid RPCs for production)
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

# Fiat Gateway
MONERIUM_API_KEY=your_api_key
MONERIUM_API_SECRET=your_api_secret

# Treasury (for off-ramp)
ARGOS_TREASURY_ADDRESS=0xYourTreasuryAddress

# Database (for PostgresStorage)
DATABASE_URL=postgresql://user:pass@host:5432/wallets

# Optional
PORT=3000
NODE_ENV=production
```

## Security Checklist

- [ ] **Mnemonic storage** — Store in HSM, AWS KMS, or HashiCorp Vault, never in .env on disk
- [ ] **API authentication** — JWT or session-based auth on all endpoints
- [ ] **Rate limiting** — Apply per-user rate limits on transaction endpoints
- [ ] **Input validation** — Validate all request bodies with JSON schema
- [ ] **HTTPS only** — TLS termination at load balancer or reverse proxy
- [ ] **CORS** — Restrict to your frontend domain
- [ ] **Key rotation** — Plan for mnemonic rotation and key migration
- [ ] **Monitoring** — Alert on failed transactions, unusual volumes
- [ ] **Backup** — Regular database backups with encrypted snapshots
- [ ] **Audit log** — Log all wallet creation and transaction events

## Scaling Considerations

### Multi-Instance

If running multiple server instances:
1. Use PostgreSQL or Redis-backed storage (not in-memory)
2. Replace `EventBus` with a Redis pub/sub implementation
3. Use webhooks from fiat providers instead of polling

### Database Indexes

```sql
CREATE INDEX idx_transactions_wallet_status ON transactions(wallet_id, status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
```

### Caching

- Cache balances with TTL (5-30 seconds)
- Use Redis for session storage
- Consider read replicas for transaction history queries

## Recommended Blockchain Configuration

| Use Case | Network | Token | Reason |
|----------|---------|-------|--------|
| European users | Polygon | EURC | 1:1 EUR stablecoin, low gas |
| US users | Base | USDC | Low gas, Coinbase ecosystem |
| Global | Polygon | USDC | Widely supported, low gas |

### Gas Sponsorship

For production, consider sponsoring gas fees via Account Abstraction (ERC-4337) or maintaining a treasury wallet with POL/ETH for gas. This provides a seamless UX where users never see gas costs.

## Monitoring

Recommended metrics to track:
- Wallet creation rate
- Transaction success/failure rate by type
- Average transaction confirmation time
- Balance anomalies
- API response times
- Fiat provider webhook delivery rate
