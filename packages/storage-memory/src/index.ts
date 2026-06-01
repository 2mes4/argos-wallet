import type {
  IStorageProvider,
  StoredWallet,
  StoredTransaction,
  StoredBankAccount,
  TransactionFilters,
  StoredExternalConnection,
} from '@argos-wallet/types';

export class MemoryStorage implements IStorageProvider {
  private wallets = new Map<string, StoredWallet>();
  private transactions = new Map<string, StoredTransaction>();
  private bankAccounts = new Map<string, StoredBankAccount>();
  private externalConnections = new Map<string, StoredExternalConnection>();

  async initialize(): Promise<void> {}

  async saveWallet(wallet: StoredWallet): Promise<void> {
    this.wallets.set(wallet.walletId, { ...wallet });
  }

  async getWallet(walletId: string): Promise<StoredWallet | null> {
    const wallet = this.wallets.get(walletId);
    return wallet ? { ...wallet } : null;
  }

  async updateWallet(walletId: string, updates: Partial<StoredWallet>): Promise<StoredWallet> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new Error(`Wallet ${walletId} not found`);
    const updated = { ...wallet, ...updates, updatedAt: new Date() };
    this.wallets.set(walletId, updated);
    return { ...updated };
  }

  async saveTransaction(tx: StoredTransaction): Promise<void> {
    this.transactions.set(tx.id, { ...tx });
  }

  async getTransaction(txId: string): Promise<StoredTransaction | null> {
    const tx = this.transactions.get(txId);
    return tx ? { ...tx } : null;
  }

  async getTransactionByTxHash(txHash: string): Promise<StoredTransaction | null> {
    for (const tx of this.transactions.values()) {
      if (tx.txHash === txHash) return { ...tx };
    }
    return null;
  }

  async updateTransaction(txId: string, updates: Partial<StoredTransaction>): Promise<StoredTransaction> {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error(`Transaction ${txId} not found`);
    const updated = { ...tx, ...updates, updatedAt: new Date() };
    this.transactions.set(txId, updated);
    return { ...updated };
  }

  async listTransactions(walletId: string, filters?: TransactionFilters): Promise<StoredTransaction[]> {
    let results = Array.from(this.transactions.values())
      .filter((tx) => tx.walletId === walletId);

    if (filters?.type) {
      results = results.filter((tx) => tx.type === filters.type);
    }
    if (filters?.status) {
      results = results.filter((tx) => tx.status === filters.status);
    }
    if (filters?.network) {
      results = results.filter((tx) => tx.network === filters.network);
    }
    if (filters?.from) {
      results = results.filter((tx) => tx.createdAt >= filters.from!);
    }
    if (filters?.to) {
      results = results.filter((tx) => tx.createdAt <= filters.to!);
    }

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      results = results.slice(filters.offset ?? 0, (filters.offset ?? 0) + filters.limit);
    }

    return results.map((tx) => ({ ...tx }));
  }

  async saveBankAccount(account: StoredBankAccount): Promise<void> {
    this.bankAccounts.set(account.id, { ...account });
  }

  async getBankAccounts(walletId: string): Promise<StoredBankAccount[]> {
    return Array.from(this.bankAccounts.values())
      .filter((a) => a.walletId === walletId)
      .map((a) => ({ ...a }));
  }

  async getBankAccount(accountId: string): Promise<StoredBankAccount | null> {
    const account = this.bankAccounts.get(accountId);
    return account ? { ...account } : null;
  }

  async saveExternalConnection(connection: StoredExternalConnection): Promise<void> {
    this.externalConnections.set(connection.id, { ...connection });
  }

  async getExternalConnections(walletId: string): Promise<StoredExternalConnection[]> {
    return Array.from(this.externalConnections.values())
      .filter((c) => c.walletId === walletId)
      .map((c) => ({ ...c }));
  }

  async getExternalConnection(id: string): Promise<StoredExternalConnection | null> {
    const conn = this.externalConnections.get(id);
    return conn ? { ...conn } : null;
  }

  async deleteExternalConnection(id: string): Promise<void> {
    this.externalConnections.delete(id);
  }

  async destroy(): Promise<void> {
    this.wallets.clear();
    this.transactions.clear();
    this.bankAccounts.clear();
  }
}
