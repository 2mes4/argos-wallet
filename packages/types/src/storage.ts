export interface StoredWallet {
  walletId: string;
  addresses: Record<string, string>;
  encryptedKeys: Record<string, string>;
  fiatCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredTransaction {
  id: string;
  walletId: string;
  type: import('./transaction').TransactionType;
  status: import('./transaction').TransactionStatus;
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

export interface StoredBankAccount {
  id: string;
  walletId: string;
  fiatProviderBankId: string;
  maskedIban: string;
  bankName?: string;
  currency: string;
  status: 'LINKED' | 'PENDING_VERIFICATION' | 'REJECTED';
  createdAt: Date;
}

export interface IStorageProvider {
  initialize(): Promise<void>;

  saveWallet(wallet: StoredWallet): Promise<void>;
  getWallet(walletId: string): Promise<StoredWallet | null>;
  updateWallet(walletId: string, updates: Partial<StoredWallet>): Promise<StoredWallet>;

  saveTransaction(tx: StoredTransaction): Promise<void>;
  getTransaction(txId: string): Promise<StoredTransaction | null>;
  getTransactionByTxHash(txHash: string): Promise<StoredTransaction | null>;
  updateTransaction(txId: string, updates: Partial<StoredTransaction>): Promise<StoredTransaction>;
  listTransactions(
    walletId: string,
    filters?: import('./transaction').TransactionFilters,
  ): Promise<StoredTransaction[]>;

  saveBankAccount(account: StoredBankAccount): Promise<void>;
  getBankAccounts(walletId: string): Promise<StoredBankAccount[]>;
  getBankAccount(accountId: string): Promise<StoredBankAccount | null>;

  saveExternalConnection(connection: import('./external-wallet').StoredExternalConnection): Promise<void>;
  getExternalConnections(walletId: string): Promise<import('./external-wallet').StoredExternalConnection[]>;
  getExternalConnection(id: string): Promise<import('./external-wallet').StoredExternalConnection | null>;
  deleteExternalConnection(id: string): Promise<void>;

  destroy(): Promise<void>;
}
