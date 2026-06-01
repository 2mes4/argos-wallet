# API Reference

## Authentication

All requests require an API key passed via the `Authorization` header or `X-API-Key` header:

```
Authorization: Bearer ow_<your-api-key>
```

## Tenant Management

### Register a new tenant

```http
POST /v1/tenants/register
Content-Type: application/json

{
  "name": "My App",
  "plan": "starter"
}
```

Response:
```json
{
  "tenant": {
    "id": "uuid",
    "name": "My App",
    "slug": "MyApp_abc12345",
    "plan": "starter",
    "schema": "tenant_MyApp_abc12345"
  },
  "api_key": {
    "id": "uuid",
    "name": "Default",
    "api_key": "ow_<long-key>"
  }
}
```

## Wallets

### Create wallet

```http
POST /v1/wallets
Authorization: Bearer ow_<key>

{
  "external_id": "user-123",
  "networks": ["polygon", "ethereum"]
}
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "external_id": "user-123",
  "status": "active",
  "addresses": {
    "polygon": "0x...",
    "ethereum": "0x..."
  },
  "balances": [],
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Get wallet

```http
GET /v1/wallets/{walletId}
```

### Get addresses

```http
GET /v1/wallets/{walletId}/addresses
```

### Get balances

```http
GET /v1/wallets/{walletId}/balances
```

### Deactivate wallet

```http
DELETE /v1/wallets/{walletId}
```

### Link external wallet

```http
POST /v1/wallets/{walletId}/connections

{
  "provider": "metamask",
  "address": "0x742d...",
  "chain_id": 137
}
```

### List external connections

```http
GET /v1/wallets/{walletId}/connections
```

### Unlink external wallet

```http
DELETE /v1/wallets/{walletId}/connections/{connectionId}
```

## Transactions

### Crypto transfer

```http
POST /v1/transactions/transfer

{
  "wallet_id": "uuid",
  "network": "polygon",
  "token": "USDC",
  "amount": "100",
  "to_address": "0x..."
}
```

### Fiat to crypto

```http
POST /v1/transactions/fiat-to-crypto

{
  "wallet_id": "uuid",
  "amount": "100",
  "source_currency": "EUR",
  "target_crypto": "USDC",
  "network": "polygon",
  "bank_account_id": "..."
}
```

### Crypto to fiat

```http
POST /v1/transactions/crypto-to-fiat

{
  "wallet_id": "uuid",
  "network": "polygon",
  "crypto_symbol": "USDC",
  "amount": "50",
  "target_currency": "EUR",
  "target_bank_account_id": "..."
}
```

### Smart contract call

```http
POST /v1/transactions/contract-call

{
  "wallet_id": "uuid",
  "network": "polygon",
  "contract_address": "0x...",
  "abi": [...],
  "method": "transfer",
  "args": ["0x...", "1000000"]
}
```

### Get transaction

```http
GET /v1/transactions/{txId}
```

### List transactions

```http
GET /v1/transactions?wallet_id=uuid&type=crypto_transfer&status=completed&limit=50&offset=0
```

### Cancel transaction

```http
POST /v1/transactions/{txId}/cancel
```

## Routing Rules

### Create rule

```http
POST /v1/routing/rules

{
  "wallet_id": "uuid",
  "name": "Auto-sweep USDC",
  "type": "sweep",
  "conditions": {
    "network": "polygon",
    "token": "USDC",
    "threshold": "500",
    "trigger": "on_receive"
  },
  "actions": {
    "target_type": "wallet",
    "target_wallet_id": "uuid",
    "amount": "all"
  }
}
```

### List rules

```http
GET /v1/routing/rules?wallet_id=uuid
```

### Execute rule manually

```http
POST /v1/routing/rules/{ruleId}/execute
```

### List executions

```http
GET /v1/routing/rules/{ruleId}/executions
```

### Update rule

```http
PUT /v1/routing/rules/{ruleId}

{
  "enabled": false
}
```

### Delete rule

```http
DELETE /v1/routing/rules/{ruleId}
```

## Identity

### Sign message

```http
POST /v1/identity/sign-message

{
  "wallet_id": "uuid",
  "message": "auth-challenge"
}
```

Response:
```json
{
  "signature": "0x...",
  "address": "0x..."
}
```

### Verify signature

```http
POST /v1/identity/verify-signature

{
  "message": "auth-challenge",
  "signature": "0x...",
  "address": "0x..."
}
```

Response:
```json
{
  "valid": true
}
```

## Health

```http
GET /v1/health     # Liveness probe
GET /v1/ready      # Readiness probe (checks DB)
```

## Error Responses

All errors return HTTP 4xx/5xx with a JSON body:

```json
{
  "error": "descriptive error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request — invalid input |
| 401 | Unauthorized — invalid or missing API key |
| 404 | Not found — resource doesn't exist |
| 429 | Too many requests — rate limit exceeded |
| 500 | Internal server error |
