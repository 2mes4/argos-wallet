# UI Components

The `@argos-wallet/ui` package provides embeddable Web Components built with [Lit](https://lit.dev/). They work in any framework or no framework at all.

## Installation

```bash
npm install @argos-wallet/ui
```

## Usage

### Vanilla HTML

```html
<script type="module">
  import '@argos-wallet/ui';
</script>

<argos-provider wallet-id="..." api-url="..." auth-token="...">
  <argos-card supported-tokens="USDC,EURC"></argos-card>
</argos-provider>
```

### React

```jsx
import '@argos-wallet/ui';

function WalletDashboard({ walletId, apiUrl, authToken }) {
  return (
    <argos-provider wallet-id={walletId} api-url={apiUrl} auth-token={authToken}>
      <argos-card supported-tokens="USDC,EURC,POL"></argos-card>
      <fiat-bridge-wizard default-mode="on-ramp"></fiat-bridge-wizard>
      <tx-history-list limit="20"></tx-history-list>
    </argos-provider>
  );
}
```

### Vue

```vue
<template>
  <argos-provider :wallet-id="walletId" :api-url="apiUrl" :auth-token="authToken">
    <argos-card supported-tokens="USDC,EURC"></argos-card>
  </argos-provider>
</template>

<script setup>
import '@argos-wallet/ui';

const walletId = '...';
const apiUrl = '...';
const authToken = '...';
</script>
```

### Angular

```typescript
// In your module
import '@argos-wallet/ui';

// Add CUSTOM_ELEMENTS_SCHEMA to your module's schemas
@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // ...
})

// In your component template
// <argos-provider [attr.wallet-id]="walletId" [attr.api-url]="apiUrl">
//   <argos-card supported-tokens="USDC,EURC"></argos-card>
// </argos-provider>
```

## Components Reference

### `<argos-provider>`

The root context provider. Must wrap all other Argos Wallet components.

**Attributes:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `wallet-id` | string | Yes | The wallet ID to manage |
| `api-url` | string | Yes | Your backend API base URL |
| `auth-token` | string | No | JWT token for API authentication |

**Events:**

| Name | Detail | Description |
|------|--------|-------------|
| `argos-context-change` | `WalletContextState` | Fired when context changes |

---

### `<argos-card>`

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
argos-card {
  --argos-card-bg: #ffffff;
  --argos-card-radius: 16px;
  --argos-card-shadow: 0 4px 24px rgba(0,0,0,0.08);
  --argos-card-max-width: 420px;
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
| `argos-transaction-created` | `InternalTransaction` | Fired when transaction is created |

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
| `argos-transfer-sent` | `InternalTransaction` | Fired when transfer is submitted |

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
  --argos-primary: #1a1a2e;
  --argos-primary-hover: #2d2d4e;
  --argos-success: #2e7d32;
  --argos-error: #c62828;
  --argos-warning: #f57f17;
  --argos-bg: #ffffff;
  --argos-surface: #f8f9fa;
  --argos-text: #1a1a2e;
  --argos-text-muted: #888;
  --argos-border: #e0e0e0;
  --argos-radius: 10px;
  --argos-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

## Styling Notes

- All components use `shadowRoot` for style encapsulation
- Components are responsive and work on mobile
- Font inherits from the host page
- Colors follow a neutral palette that fits most designs
