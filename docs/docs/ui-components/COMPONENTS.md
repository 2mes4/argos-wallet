# UI Components

The `@open-wallet/ui` package provides embeddable Web Components built with [Lit](https://lit.dev/). They work in any framework or no framework at all.

## Installation

```bash
npm install @open-wallet/ui
```

## Usage

### Vanilla HTML

```html
<script type="module">
  import '@open-wallet/ui';
</script>

<open-wallet-provider wallet-id="..." api-url="..." auth-token="...">
  <open-wallet-card supported-tokens="USDC,EURC"></open-wallet-card>
</open-wallet-provider>
```

### React

```jsx
import '@open-wallet/ui';

function WalletDashboard({ walletId, apiUrl, authToken }) {
  return (
    <open-wallet-provider wallet-id={walletId} api-url={apiUrl} auth-token={authToken}>
      <open-wallet-card supported-tokens="USDC,EURC,POL"></open-wallet-card>
      <fiat-bridge-wizard default-mode="on-ramp"></fiat-bridge-wizard>
      <tx-history-list limit="20"></tx-history-list>
    </open-wallet-provider>
  );
}
```

### Vue

```vue
<template>
  <open-wallet-provider :wallet-id="walletId" :api-url="apiUrl" :auth-token="authToken">
    <open-wallet-card supported-tokens="USDC,EURC"></open-wallet-card>
  </open-wallet-provider>
</template>

<script setup>
import '@open-wallet/ui';

const walletId = '...';
const apiUrl = '...';
const authToken = '...';
</script>
```

### Angular

```typescript
// In your module
import '@open-wallet/ui';

// Add CUSTOM_ELEMENTS_SCHEMA to your module's schemas
@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // ...
})

// In your component template
// <open-wallet-provider [attr.wallet-id]="walletId" [attr.api-url]="apiUrl">
//   <open-wallet-card supported-tokens="USDC,EURC"></open-wallet-card>
// </open-wallet-provider>
```

## Components Reference

### `<open-wallet-provider>`

The root context provider. Must wrap all other Open Wallet components.

**Attributes:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `wallet-id` | string | Yes | The wallet ID to manage |
| `api-url` | string | Yes | Your backend API base URL |
| `auth-token` | string | No | JWT token for API authentication |

**Events:**

| Name | Detail | Description |
|------|--------|-------------|
| `ow-context-change` | `WalletContextState` | Fired when context changes |

---

### `<open-wallet-card>`

Displays token balances in a card layout with network badges.

**Attributes:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `wallet-id` | string | — | Override provider wallet ID |
| `api-url` | string | — | Override provider API URL |
| `auth-token` | string | — | Override provider auth token |
| `supported-tokens` | string | `"USDC,EURC"` | Comma-separated list of token symbols to display |
| `active-network` | string | — | Filter to a specific network slug |

**CSS Custom Properties:**

```css
open-wallet-card {
  --ow-card-bg: #ffffff;
  --ow-card-radius: 16px;
  --ow-card-shadow: 0 4px 24px rgba(0,0,0,0.08);
  --ow-card-max-width: 420px;
}
```

---

### `<fiat-bridge-wizard>`

A multi-step wizard for converting between fiat and crypto.

**Attributes:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `wallet-id` | string | — | Override provider wallet ID |
| `api-url` | string | — | Override provider API URL |
| `auth-token` | string | — | Override provider auth token |
| `default-mode` | `"on-ramp"` \| `"off-ramp"` | `"on-ramp"` | Initial tab mode |

**Events:**

| Name | Detail | Description |
|------|--------|-------------|
| `ow-transaction-created` | `InternalTransaction` | Fired when transaction is created |

**Wizard Steps:**

1. **Select Route** — Choose source/destination (bank ↔ crypto) and network
2. **Enter Amount** — Specify the amount to convert
3. **Instructions** — Shows deposit instructions (IBAN, reference) for on-ramp

---

### `<crypto-send-form>`

Send crypto to an external address.

**Attributes:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `wallet-id` | string | — | Override provider wallet ID |
| `api-url` | string | — | Override provider API URL |
| `auth-token` | string | — | Override provider auth token |
| `network` | string | `"polygon"` | Blockchain network |
| `token` | string | `"USDC"` | Token to send |

**Events:**

| Name | Detail | Description |
|------|--------|-------------|
| `ow-transfer-sent` | `InternalTransaction` | Fired when transfer is submitted |

---

### `<tx-history-list>`

Displays a chronological list of all transactions.

**Attributes:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `wallet-id` | string | — | Override provider wallet ID |
| `api-url` | string | — | Override provider API URL |
| `auth-token` | string | — | Override provider auth token |
| `limit` | number | `20` | Maximum transactions to display |

**Features:**
- Color-coded transaction types (deposit, withdrawal, transfer, contract)
- Real-time status badges (INITIATED, PENDING, CONFIRMING, COMPLETED, FAILED)
- Network labels on each transaction
- Refresh button for manual updates

## Theming

All components support CSS custom properties for theming:

```css
:root {
  --ow-primary: #1a1a2e;
  --ow-primary-hover: #2d2d4e;
  --ow-success: #2e7d32;
  --ow-error: #c62828;
  --ow-warning: #f57f17;
  --ow-bg: #ffffff;
  --ow-surface: #f8f9fa;
  --ow-text: #1a1a2e;
  --ow-text-muted: #888;
  --ow-border: #e0e0e0;
  --ow-radius: 10px;
  --ow-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

## Styling Notes

- All components use `shadowRoot` for style encapsulation
- Components are responsive and work on mobile
- Font inherits from the host page
- Colors follow a neutral palette that fits most designs
