export type TransactionType =
  | 'FIAT_TO_CRYPTO'
  | 'CRYPTO_TO_FIAT'
  | 'CRYPTO_TRANSFER'
  | 'SMART_CONTRACT_CALL';

export type TransactionStatus =
  | 'INITIATED'
  | 'FIAT_PENDING'
  | 'CRYPTO_PENDING'
  | 'CONFIRMING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface InternalTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  status: TransactionStatus;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  targetAmount: string;
  fee: string;
  feeCurrency: string;
  network: string;
  txHash?: string;
  bankTransferId?: string;
  contractAddress?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateFiatToCryptoParams {
  walletId: string;
  bankAccountId: string;
  amount: string;
  sourceCurrency: string;
  targetCrypto: string;
  network: string;
}

export interface CreateCryptoToFiatParams {
  walletId: string;
  network: string;
  cryptoSymbol: string;
  amount: string;
  targetCurrency: string;
  targetBankAccountId: string;
}

export interface CreateCryptoTransferParams {
  walletId: string;
  network: string;
  cryptoSymbol: string;
  amount: string;
  toAddress: string;
}

export interface CreateSmartContractParams {
  walletId: string;
  network: string;
  contractAddress: string;
  abi: unknown[];
  method: string;
  args: unknown[];
  value?: string;
}

export type TransactionEventCallback = (tx: InternalTransaction) => void;

export interface ITransactionEngine {
  initiateFiatToCrypto(params: CreateFiatToCryptoParams): Promise<InternalTransaction>;

  initiateCryptoToFiat(params: CreateCryptoToFiatParams): Promise<InternalTransaction>;

  initiateCryptoTransfer(params: CreateCryptoTransferParams): Promise<InternalTransaction>;

  initiateSmartContractCall(params: CreateSmartContractParams): Promise<InternalTransaction>;

  getTransaction(transactionId: string): Promise<InternalTransaction>;

  listTransactions(walletId: string, filters?: TransactionFilters): Promise<InternalTransaction[]>;

  onTransactionStatusChange(
    transactionId: string,
    callback: TransactionEventCallback,
  ): () => void;

  onWalletTransaction(
    walletId: string,
    callback: TransactionEventCallback,
  ): () => void;

  cancelTransaction(transactionId: string): Promise<InternalTransaction>;
}

export interface TransactionFilters {
  type?: TransactionType;
  status?: TransactionStatus;
  network?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}
