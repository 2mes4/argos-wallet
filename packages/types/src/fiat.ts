export interface FiatCustomer {
  fiatCustomerId: string;
  status: 'ACTIVE' | 'PENDING_KYC' | 'SUSPENDED';
  kycRequired?: boolean;
}

export interface BankAccountDetails {
  bankAccountId: string;
  maskedIban: string;
  bankName?: string;
  currency: string;
  status: 'LINKED' | 'PENDING_VERIFICATION' | 'REJECTED';
}

export interface TransferResult {
  transferId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  estimatedArrival: Date;
  reference?: string;
}

export interface DepositInstructions {
  transferId: string;
  destinationIban?: string;
  destinationAccount?: string;
  reference: string;
  amount: string;
  currency: string;
  bankName?: string;
  notes?: string;
}

export interface IFiatProvider {
  readonly region: string;
  readonly supportedCurrencies: string[];

  initialize(config: Record<string, unknown>): Promise<void>;

  createCustomer(walletId: string, metadata?: Record<string, unknown>): Promise<FiatCustomer>;

  getCustomer(fiatCustomerId: string): Promise<FiatCustomer>;

  linkBankAccount(
    fiatCustomerId: string,
    bankData: {
      iban?: string;
      accountNumber?: string;
      routingNumber?: string;
      currency: string;
      country?: string;
      plaidToken?: string;
    },
  ): Promise<BankAccountDetails>;

  getLinkedBankAccounts(fiatCustomerId: string): Promise<BankAccountDetails[]>;

  triggerBankWithdrawal(
    fiatCustomerId: string,
    bankAccountId: string,
    amount: string,
    currency: string,
  ): Promise<TransferResult>;

  requestBankDeposit(
    fiatCustomerId: string,
    amount: string,
    currency: string,
  ): Promise<DepositInstructions>;

  getTransferStatus(transferId: string): Promise<TransferResult>;

  destroy(): Promise<void>;
}
