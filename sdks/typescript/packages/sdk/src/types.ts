export interface Wallet {
  id: string;
  external_id?: string;
  status: 'active' | 'suspended' | 'deleted';
  addresses: Record<string, string>;
  balances: Balance[];
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Balance {
  network: string;
  token: string;
  balance: string;
  decimals: number;
}

export interface WalletAddress {
  id: string;
  wallet_id: string;
  network: string;
  address: string;
  is_default: boolean;
}

export interface ExternalConnection {
  id: string;
  wallet_id: string;
  provider: string;
  address: string;
  chain_id: number;
  connected_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  type: TransactionType;
  status: TransactionStatus;
  source_network?: string;
  source_token?: string;
  source_amount?: string;
  target_network?: string;
  target_token?: string;
  target_amount?: string;
  to_address?: string;
  tx_hash?: string;
  contract_address?: string;
  contract_method?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

export type TransactionType =
  | 'crypto_transfer'
  | 'fiat_to_crypto'
  | 'crypto_to_fiat'
  | 'smart_contract'
  | 'routing_execution';

export type TransactionStatus =
  | 'initiated'
  | 'pending'
  | 'confirming'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface RoutingRule {
  id: string;
  wallet_id: string;
  name: string;
  type: RuleType;
  priority: number;
  enabled: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  last_evaluated?: string;
  last_executed?: string;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

export type RuleType = 'sweep' | 'split' | 'forward' | 'fiat_offramp';

export interface RuleExecution {
  id: string;
  rule_id: string;
  transaction_id?: string;
  status: string;
  trigger_reason: string;
  result?: Record<string, unknown>;
  executed_at: string;
}

export interface SignMessageResponse {
  signature: string;
  address: string;
}

export interface VerifySignatureResponse {
  valid: boolean;
}

export interface CreateWalletParams {
  external_id?: string;
  networks?: string[];
  metadata?: Record<string, unknown>;
}

export interface TransferParams {
  wallet_id: string;
  network: string;
  token: string;
  amount: string;
  to_address: string;
}

export interface FiatToCryptoParams {
  wallet_id: string;
  amount: string;
  source_currency: string;
  target_crypto: string;
  network: string;
  bank_account_id?: string;
}

export interface CryptoToFiatParams {
  wallet_id: string;
  network: string;
  crypto_symbol: string;
  amount: string;
  target_currency: string;
  target_bank_account_id: string;
}

export interface ContractCallParams {
  wallet_id: string;
  network: string;
  contract_address: string;
  abi: unknown[];
  method: string;
  args?: unknown[];
  value?: string;
}

export interface CreateRuleParams {
  wallet_id: string;
  name: string;
  type: RuleType;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  priority?: number;
  enabled?: boolean;
}

export interface ListTransactionsParams {
  wallet_id?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  limit?: number;
  offset?: number;
}
