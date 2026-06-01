import type {
  IFiatProvider,
  FiatCustomer,
  BankAccountDetails,
  TransferResult,
  DepositInstructions,
} from '@argos-wallet/types';

export interface AmericasConfig {
  gateway: 'stripe' | 'meso' | 'moonpay' | 'mock';
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  countries?: string[];
}

export class AmericasFiatProvider implements IFiatProvider {
  readonly region = 'AMERICAS';
  readonly supportedCurrencies = ['USD', 'MXN', 'BRL', 'COP'];

  private config: AmericasConfig;
  private customers = new Map<string, FiatCustomer>();
  private bankAccounts = new Map<string, BankAccountDetails[]>();
  private transfers = new Map<string, TransferResult>();

  constructor(config: AmericasConfig) {
    this.config = config;
  }

  async initialize(config: Record<string, unknown>): Promise<void> {
    Object.assign(this.config, config);
  }

  async createCustomer(walletId: string, _metadata?: Record<string, unknown>): Promise<FiatCustomer> {
    const customer: FiatCustomer = {
      fiatCustomerId: `am-customer-${crypto.randomUUID().slice(0, 8)}`,
      status: this.config.gateway === 'mock' ? 'ACTIVE' : 'PENDING_KYC',
      kycRequired: this.config.gateway !== 'mock',
    };
    this.customers.set(walletId, customer);
    return customer;
  }

  async getCustomer(fiatCustomerId: string): Promise<FiatCustomer> {
    for (const c of this.customers.values()) {
      if (c.fiatCustomerId === fiatCustomerId) return c;
    }
    throw new Error(`Customer ${fiatCustomerId} not found`);
  }

  async linkBankAccount(fiatCustomerId: string, bankData: {
    iban?: string; accountNumber?: string; routingNumber?: string;
    currency: string; country?: string; plaidToken?: string;
  }): Promise<BankAccountDetails> {
    const account: BankAccountDetails = {
      bankAccountId: `am-bank-${crypto.randomUUID().slice(0, 8)}`,
      maskedIban: bankData.accountNumber
        ? `****${bankData.accountNumber.slice(-4)}`
        : bankData.iban
          ? `****${bankData.iban.slice(-4)}`
          : '****',
      currency: bankData.currency,
      status: 'LINKED',
    };
    const existing = this.bankAccounts.get(fiatCustomerId) ?? [];
    existing.push(account);
    this.bankAccounts.set(fiatCustomerId, existing);
    return account;
  }

  async getLinkedBankAccounts(fiatCustomerId: string): Promise<BankAccountDetails[]> {
    return this.bankAccounts.get(fiatCustomerId) ?? [];
  }

  async triggerBankWithdrawal(_fiatCustomerId: string, _bankAccountId: string, _amount: string, _currency: string): Promise<TransferResult> {
    const transferId = `am-transfer-${crypto.randomUUID().slice(0, 8)}`;
    const result: TransferResult = {
      transferId,
      status: 'PROCESSING',
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
    this.transfers.set(transferId, result);
    return result;
  }

  async requestBankDeposit(_fiatCustomerId: string, amount: string, currency: string): Promise<DepositInstructions> {
    return {
      transferId: `am-deposit-${crypto.randomUUID().slice(0, 8)}`,
      reference: `OW-DEPOSIT-${Date.now()}`,
      amount,
      currency,
      notes: 'Complete the deposit through the provided payment link.',
    };
  }

  async getTransferStatus(transferId: string): Promise<TransferResult> {
    const t = this.transfers.get(transferId);
    if (!t) throw new Error(`Transfer ${transferId} not found`);
    return t;
  }

  async destroy(): Promise<void> {
    this.customers.clear();
    this.bankAccounts.clear();
    this.transfers.clear();
  }
}
