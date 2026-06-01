import { HttpClient } from '../client';
import {
  Wallet,
  Balance,
  WalletAddress,
  ExternalConnection,
  CreateWalletParams,
} from '../types';

export class WalletResource {
  constructor(private client: HttpClient) {}

  async create(params: CreateWalletParams): Promise<Wallet> {
    return this.client.post<Wallet>('/v1/wallets', params);
  }

  async get(walletId: string): Promise<Wallet> {
    return this.client.get<Wallet>(`/v1/wallets/${walletId}`);
  }

  async getAddresses(walletId: string): Promise<WalletAddress[]> {
    return this.client.get<WalletAddress[]>(`/v1/wallets/${walletId}/addresses`);
  }

  async getBalances(walletId: string): Promise<Balance[]> {
    return this.client.get<Balance[]>(`/v1/wallets/${walletId}/balances`);
  }

  async deactivate(walletId: string): Promise<void> {
    return this.client.delete(`/v1/wallets/${walletId}`);
  }

  async linkExternal(
    walletId: string,
    params: { provider: string; address: string; chain_id: number; signature?: string },
  ): Promise<ExternalConnection> {
    return this.client.post<ExternalConnection>(
      `/v1/wallets/${walletId}/connections`,
      params,
    );
  }

  async listConnections(walletId: string): Promise<ExternalConnection[]> {
    return this.client.get<ExternalConnection[]>(`/v1/wallets/${walletId}/connections`);
  }

  async unlinkExternal(walletId: string, connectionId: string): Promise<void> {
    return this.client.delete(`/v1/wallets/${walletId}/connections/${connectionId}`);
  }
}
