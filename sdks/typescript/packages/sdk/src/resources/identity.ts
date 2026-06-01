import { HttpClient } from '../client';
import { SignMessageResponse, VerifySignatureResponse } from '../types';

export class IdentityResource {
  constructor(private client: HttpClient) {}

  async signMessage(
    walletId: string,
    message: string,
  ): Promise<SignMessageResponse> {
    return this.client.post<SignMessageResponse>('/v1/identity/sign-message', {
      wallet_id: walletId,
      message,
    });
  }

  async verifySignature(
    message: string,
    signature: string,
    address: string,
  ): Promise<VerifySignatureResponse> {
    return this.client.post<VerifySignatureResponse>(
      '/v1/identity/verify-signature',
      { message, signature, address },
    );
  }

  async signTransaction(
    walletId: string,
    network: string,
    to: string,
    value?: string,
    data?: string,
  ): Promise<{ signed_tx: string; tx_hash: string }> {
    return this.client.post('/v1/identity/sign-transaction', {
      wallet_id: walletId,
      network,
      to,
      value,
      data,
    });
  }
}
