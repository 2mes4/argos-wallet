const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  schema_name: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  external_id: string;
  status: string;
  addresses: Record<string, string>;
  balances: Balance[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Balance {
  network: string;
  token: string;
  balance: string;
  decimals: number;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  type: string;
  status: string;
  source_network: string;
  source_token: string;
  source_amount: string;
  to_address: string;
  tx_hash: string;
  created_at: string;
}

export interface RoutingRule {
  id: string;
  wallet_id: string;
  name: string;
  type: string;
  enabled: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  execution_count: number;
  created_at: string;
}

export interface ExternalConnection {
  id: string;
  wallet_id: string;
  provider: string;
  address: string;
  chain_id: number;
  connected_at: string;
}

function getAuthHeaders(): HeadersInit {
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("argos_api_key") : null;
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth && typeof window !== "undefined") {
    const apiKey = localStorage.getItem("argos_api_key");
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  register: (name: string) =>
    request<{ tenant: Tenant; api_key: ApiKey }>(
      "POST",
      "/v1/tenants/register",
      { name },
      false
    ),

  // Wallets
  createWallet: (external_id: string, networks: string[]) =>
    request<Wallet>("POST", "/v1/wallets", { external_id, networks }),

  getWallet: (id: string) => request<Wallet>("GET", `/v1/wallets/${id}`),

  listWallets: () => {
    return fetch(`${API_URL}/v1/wallets`, { headers: getAuthHeaders() }).then(
      (r) => r.json() as Promise<Wallet[]>
    );
  },

  getAddresses: (walletId: string) =>
    request<unknown[]>("GET", `/v1/wallets/${walletId}/addresses`),

  deactivateWallet: (id: string) =>
    request<Wallet>("DELETE", `/v1/wallets/${id}`),

  // External connections
  linkExternal: (
    walletId: string,
    provider: string,
    address: string,
    chain_id: number
  ) =>
    request<ExternalConnection>("POST", `/v1/wallets/${walletId}/connections`, {
      provider,
      address,
      chain_id,
    }),

  listConnections: (walletId: string) =>
    request<ExternalConnection[]>(
      "GET",
      `/v1/wallets/${walletId}/connections`
    ),

  // Transactions
  listTransactions: (walletId?: string) => {
    const params = walletId ? `?wallet_id=${walletId}` : "";
    return request<Transaction[]>("GET", `/v1/transactions${params}`);
  },

  // Routing
  createRule: (rule: {
    wallet_id: string;
    name: string;
    type: string;
    conditions: Record<string, unknown>;
    actions: Record<string, unknown>;
  }) => request<RoutingRule>("POST", "/v1/routing/rules", rule),

  listRules: (walletId: string) =>
    request<RoutingRule[]>(
      "GET",
      `/v1/routing/rules?wallet_id=${walletId}`
    ),

  executeRule: (ruleId: string) =>
    request<{ id: string; status: string }>(
      "POST",
      `/v1/routing/rules/${ruleId}/execute`
    ),

  deleteRule: (ruleId: string) =>
    request<void>("DELETE", `/v1/routing/rules/${ruleId}`),

  // Identity
  signMessage: (walletId: string, message: string) =>
    request<{ signature: string; address: string }>(
      "POST",
      "/v1/identity/sign-message",
      { wallet_id: walletId, message }
    ),
};
