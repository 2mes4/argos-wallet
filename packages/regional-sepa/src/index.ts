import type {
  IFiatProvider,
  FiatCustomer,
  BankAccountDetails,
  TransferResult,
  DepositInstructions,
} from '@argos-wallet/types';

export interface SepaConfig {
  gateway: 'monerium' | 'stripe' | 'mock';
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  webhookSecret?: string;
}

export class SepaFiatProvider implements IFiatProvider {
  readonly region = 'EU';
  readonly supportedCurrencies = ['EUR'];

  private config: SepaConfig;
  private baseUrl: string;
  private customers = new Map<string, FiatCustomer>();
  private bankAccounts = new Map<string, BankAccountDetails[]>();
  private transfers = new Map<string, TransferResult>();
  private customerCounter = 0;

  constructor(config: SepaConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl ?? 'https://api.monerium.com';
  }

  async initialize(config: Record<string, unknown>): Promise<void> {
    Object.assign(this.config, config);
  }

  async createCustomer(walletId: string, _metadata?: Record<string, unknown>): Promise<FiatCustomer> {
    if (this.config.gateway === 'mock') {
      const customer: FiatCustomer = {
        fiatCustomerId: `sepa-customer-${++this.customerCounter}`,
        status: 'ACTIVE',
        kycRequired: false,
      };
      this.customers.set(walletId, customer);
      return customer;
    }

    if (this.config.gateway === 'monerium') {
      return this.createMoneriumCustomer(walletId);
    }

    throw new Error(`Unsupported SEPA gateway: ${this.config.gateway}`);
  }

  async getCustomer(fiatCustomerId: string): Promise<FiatCustomer> {
    for (const customer of this.customers.values()) {
      if (customer.fiatCustomerId === fiatCustomerId) {
        return customer;
      }
    }
    throw new Error(`Customer ${fiatCustomerId} not found`);
  }

  async linkBankAccount(
    fiatCustomerId: string,
    bankData: {
      iban?: string;
      accountNumber?: string;
      routingNumber?: string;
      currency: string;
      country?: string;
      plaidToken?: string;
    },
  ): Promise<BankAccountDetails> {
    if (!bankData.iban) {
      throw new Error('IBAN is required for SEPA bank accounts');
    }

    const account: BankAccountDetails = {
      bankAccountId: `sepa-bank-${crypto.randomUUID().slice(0, 8)}`,
      maskedIban: this.maskIban(bankData.iban),
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

  async triggerBankWithdrawal(
    fiatCustomerId: string,
    bankAccountId: string,
    amount: string,
    currency: string,
  ): Promise<TransferResult> {
    const transferId = `sepa-transfer-${crypto.randomUUID().slice(0, 8)}`;
    const result: TransferResult = {
      transferId,
      status: 'PROCESSING',
      estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    this.transfers.set(transferId, result);

    if (this.config.gateway === 'mock') {
      setTimeout(() => {
        this.transfers.set(transferId, {
          ...result,
          status: 'COMPLETED',
        });
      }, 5000);
    } else if (this.config.gateway === 'monerium') {
      await this.createMoneriumOrder(fiatCustomerId, bankAccountId, amount, currency, transferId);
    }

    return result;
  }

  async requestBankDeposit(
    fiatCustomerId: string,
    amount: string,
    currency: string,
  ): Promise<DepositInstructions> {
    const transferId = `sepa-deposit-${crypto.randomUUID().slice(0, 8)}`;
    const reference = `OW-${transferId}`;

    if (this.config.gateway === 'mock') {
      return {
        transferId,
        destinationIban: 'ES91 2100 0418 4502 0005 1332',
        reference,
        amount,
        currency,
        bankName: 'Argos Wallet Treasury Bank (Mock)',
        notes: 'Transfer the exact amount with the reference in the concept field.',
      };
    }

    return this.createMoneriumDeposit(fiatCustomerId, amount, currency, transferId);
  }

  async getTransferStatus(transferId: string): Promise<TransferResult> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error(`Transfer ${transferId} not found`);
    }
    return transfer;
  }

  async destroy(): Promise<void> {
    this.customers.clear();
    this.bankAccounts.clear();
    this.transfers.clear();
  }

  private maskIban(iban: string): string {
    const cleaned = iban.replace(/\s/g, '');
    const first4 = cleaned.slice(0, 4);
    const last4 = cleaned.slice(-4);
    const middle = '*'.repeat(cleaned.length - 8);
    return `${first4}${middle}${last4}`;
  }

  private async createMoneriumCustomer(walletId: string): Promise<FiatCustomer> {
    const response = await fetch(`${this.baseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.apiKey ?? '',
        client_secret: this.config.apiSecret ?? '',
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with Monerium');
    }

    const customer: FiatCustomer = {
      fiatCustomerId: `monerium-${walletId}`,
      status: 'PENDING_KYC',
      kycRequired: true,
    };

    this.customers.set(walletId, customer);
    return customer;
  }

  private async createMoneriumOrder(..._args: unknown[]): Promise<void> {
    // In production, this would call Monerium's /orders API
    // to create a redeem (off-ramp) order
  }

  private async createMoneriumDeposit(
    _fiatCustomerId: string,
    amount: string,
    currency: string,
    transferId: string,
  ): Promise<DepositInstructions> {
    return {
      transferId,
      destinationIban: 'REPLACE_WITH_MONERIUM_IBAN',
      reference: `OW-${transferId}`,
      amount: amount,
      currency: currency,
      bankName: 'Monerium',
    };
  }
}
