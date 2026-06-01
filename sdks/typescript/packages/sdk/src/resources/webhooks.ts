import { HttpClient } from '../client';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  fail_count: number;
  created_at: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
}

export class WebhookResource {
  constructor(private client: HttpClient) {}

  /**
   * Creates a new webhook endpoint.
   *
   * @example
   * ```typescript
   * const webhook = await argos.webhooks.create({
   *   url: 'https://yourapp.com/webhooks/argos',
   *   events: ['transaction.confirmed', 'wallet.created'],
   * });
   * ```
   */
  async create(req: CreateWebhookRequest): Promise<Webhook> {
    return this.client.post<Webhook>('/v1/webhooks', req);
  }

  /** Lists all webhooks. */
  async list(): Promise<Webhook[]> {
    return this.client.get<Webhook[]>('/v1/webhooks');
  }

  /** Deletes a webhook. */
  async delete(webhookId: string): Promise<void> {
    await this.client.delete(`/v1/webhooks/${webhookId}`);
  }
}
