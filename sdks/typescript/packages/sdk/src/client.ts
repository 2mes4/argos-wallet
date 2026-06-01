import { APIError } from './errors';

export interface ClientConfig {
  apiKey: string;
  apiUrl?: string;
}

export class HttpClient {
  private apiKey: string;
  private baseURL: string;

  constructor(config: ClientConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.apiUrl || 'http://localhost:8080';
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-API-Key': this.apiKey,
      'User-Agent': 'argos-wallet-sdk-ts/0.2.0',
    };

    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new APIError(response.status, error.error || response.statusText);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
