/**
 * Argos Wallet — TypeScript SDK
 *
 * Self-hosted multi-tenant wallet infrastructure for Web3.
 *
 * @packageDocumentation
 */

export { HttpClient } from './client';
export type { ClientConfig } from './client';
export { APIError } from './errors';
export { WalletResource } from './resources/wallets';
export { TransactionResource } from './resources/transactions';
export { RoutingResource } from './resources/routing';
export { IdentityResource } from './resources/identity';
export { WebhookResource } from './resources/webhooks';
export * from './types';

import { HttpClient } from './client';
import type { ClientConfig } from './client';
import { WalletResource } from './resources/wallets';
import { TransactionResource } from './resources/transactions';
import { RoutingResource } from './resources/routing';
import { IdentityResource } from './resources/identity';
import { WebhookResource } from './resources/webhooks';

/**
 * Main client for interacting with the Argos Wallet API.
 *
 * @example
 * ```typescript
 * import { Argos } from '@argos-wallet/sdk';
 *
 * const argos = new Argos({
 *   apiKey: 'ow_your_api_key',
 *   apiUrl: 'http://localhost:8080',
 * });
 *
 * const wallet = await argos.wallets.create({
 *   externalId: 'user-123',
 *   networks: ['polygon'],
 * });
 * console.log(wallet.addresses.polygon);
 * ```
 */
export class Argos {
  public readonly wallets: WalletResource;
  public readonly transactions: TransactionResource;
  public readonly routing: RoutingResource;
  public readonly identity: IdentityResource;
  public readonly webhooks: WebhookResource;

  private client: HttpClient;

  constructor(config: ClientConfig) {
    this.client = new HttpClient(config);
    this.wallets = new WalletResource(this.client);
    this.transactions = new TransactionResource(this.client);
    this.routing = new RoutingResource(this.client);
    this.identity = new IdentityResource(this.client);
    this.webhooks = new WebhookResource(this.client);
  }
}
