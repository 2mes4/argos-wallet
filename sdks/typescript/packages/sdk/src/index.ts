export { HttpClient } from './client';
export { APIError } from './errors';
export { WalletResource } from './resources/wallets';
export { TransactionResource } from './resources/transactions';
export { RoutingResource } from './resources/routing';
export { IdentityResource } from './resources/identity';
export * from './types';

import { HttpClient } from './client';
import { WalletResource } from './resources/wallets';
import { TransactionResource } from './resources/transactions';
import { RoutingResource } from './resources/routing';
import { IdentityResource } from './resources/identity';
import type { ClientConfig } from './client';

export class OpenWallet {
  public readonly wallets: WalletResource;
  public readonly transactions: TransactionResource;
  public readonly routing: RoutingResource;
  public readonly identity: IdentityResource;

  private client: HttpClient;

  constructor(config: ClientConfig) {
    this.client = new HttpClient(config);
    this.wallets = new WalletResource(this.client);
    this.transactions = new TransactionResource(this.client);
    this.routing = new RoutingResource(this.client);
    this.identity = new IdentityResource(this.client);
  }
}
