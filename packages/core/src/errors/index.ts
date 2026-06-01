export class ArgosError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ArgosError';
  }
}

export class WalletNotFoundError extends ArgosError {
  constructor(walletId: string) {
    super(`Wallet not found: ${walletId}`, 'WALLET_NOT_FOUND', { walletId });
    this.name = 'WalletNotFoundError';
  }
}

export class ProviderNotConfiguredError extends ArgosError {
  constructor(providerType: string) {
    super(`${providerType} provider not configured`, 'PROVIDER_NOT_CONFIGURED', { providerType });
    this.name = 'ProviderNotConfiguredError';
  }
}

export class TransactionFailedError extends ArgosError {
  constructor(reason: string, txId?: string) {
    super(`Transaction failed: ${reason}`, 'TRANSACTION_FAILED', { reason, txId });
    this.name = 'TransactionFailedError';
  }
}

export class InsufficientBalanceError extends ArgosError {
  constructor(token: string, required: string, available: string) {
    super(
      `Insufficient ${token} balance: required ${required}, available ${available}`,
      'INSUFFICIENT_BALANCE',
      { token, required, available },
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class NetworkNotSupportedError extends ArgosError {
  constructor(network: string) {
    super(`Network not supported: ${network}`, 'NETWORK_NOT_SUPPORTED', { network });
    this.name = 'NetworkNotSupportedError';
  }
}
