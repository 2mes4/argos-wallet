export interface WalletAccount {
  address: string;
  publicKey: string;
  extraData?: Record<string, unknown>;
}

export interface TransactionResult {
  txHash: string;
  blockNumber?: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  slug: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: string;
  supportedTokens: TokenConfig[];
}

export interface TokenConfig {
  symbol: string;
  decimals: number;
  contractAddress?: string;
  isStablecoin?: boolean;
}

export interface GasConfig {
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasLimit?: number;
  sponsorGas?: boolean;
}

export interface IBlockchainProvider {
  readonly networkSlug: string;
  readonly config: NetworkConfig;

  initialize(config: NetworkConfig): Promise<void>;

  getOrCreateWallet(walletId: string): Promise<WalletAccount>;

  getBalance(address: string, tokenSymbol: string): Promise<string>;

  transferTokens(
    fromAddress: string,
    toAddress: string,
    amount: string,
    tokenSymbol: string,
    gasConfig?: GasConfig,
  ): Promise<TransactionResult>;

  executeSmartContract(
    walletId: string,
    contractAddress: string,
    abi: unknown[],
    method: string,
    args: unknown[],
    value?: string,
    gasConfig?: GasConfig,
  ): Promise<TransactionResult>;

  signMessage(walletId: string, message: string): Promise<string>;

  getTransactionStatus(txHash: string): Promise<TransactionResult>;

  destroy(): Promise<void>;
}
