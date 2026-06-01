import { HttpClient } from '../client';
import {
  Transaction,
  TransferParams,
  FiatToCryptoParams,
  CryptoToFiatParams,
  ContractCallParams,
  ListTransactionsParams,
} from '../types';

export class TransactionResource {
  constructor(private client: HttpClient) {}

  async transfer(params: TransferParams): Promise<Transaction> {
    return this.client.post<Transaction>('/v1/transactions/transfer', params);
  }

  async fiatToCrypto(params: FiatToCryptoParams): Promise<Transaction> {
    return this.client.post<Transaction>('/v1/transactions/fiat-to-crypto', params);
  }

  async cryptoToFiat(params: CryptoToFiatParams): Promise<Transaction> {
    return this.client.post<Transaction>('/v1/transactions/crypto-to-fiat', params);
  }

  async contractCall(params: ContractCallParams): Promise<Transaction> {
    return this.client.post<Transaction>('/v1/transactions/contract-call', params);
  }

  async get(txId: string): Promise<Transaction> {
    return this.client.get<Transaction>(`/v1/transactions/${txId}`);
  }

  async list(params?: ListTransactionsParams): Promise<Transaction[]> {
    const query = new URLSearchParams();
    if (params?.wallet_id) query.set('wallet_id', params.wallet_id);
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return this.client.get<Transaction[]>(`/v1/transactions${qs ? `?${qs}` : ''}`);
  }

  async cancel(txId: string): Promise<Transaction> {
    return this.client.post<Transaction>(`/v1/transactions/${txId}/cancel`);
  }
}
