import { useState, useCallback, useRef, useEffect } from 'react';
import type { WalletApiConfig, WalletState, BalanceEntry, TransactionEntry, ExternalConnection } from '../types';

export function useArgos(config: WalletApiConfig, walletId: string | null) {
  const [state, setState] = useState<WalletState>({
    walletId,
    balances: [],
    loading: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const headers = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.authToken) h['Authorization'] = `Bearer ${config.authToken}`;
    return h;
  }, [config.authToken]);

  const fetchBalances = useCallback(async () => {
    if (!walletId) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`${config.apiUrl}/v1/wallets/${walletId}/balances`, { headers: headers() });
      if (!res.ok) throw new Error(res.statusText);
      const balances: BalanceEntry[] = await res.json();
      setState((s) => ({ ...s, balances, loading: false }));
    } catch (e) {
      setState((s) => ({ ...s, error: (e as Error).message, loading: false }));
    }
  }, [walletId, config.apiUrl, headers]);

  const fetchTransactions = useCallback(async (limit = 20): Promise<TransactionEntry[]> => {
    if (!walletId) return [];
    const res = await fetch(`${config.apiUrl}/v1/wallets/${walletId}/transactions?limit=${limit}`, { headers: headers() });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }, [walletId, config.apiUrl, headers]);

  const sendCrypto = useCallback(async (params: {
    network: string; cryptoSymbol: string; amount: string; toAddress: string;
  }): Promise<TransactionEntry> => {
    const res = await fetch(`${config.apiUrl}/v1/transactions/crypto-transfer`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ walletId, ...params }),
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }, [walletId, config.apiUrl, headers]);

  const fiatToCrypto = useCallback(async (params: {
    bankAccountId: string; amount: string; sourceCurrency: string;
    targetCrypto: string; network: string;
  }): Promise<TransactionEntry> => {
    const res = await fetch(`${config.apiUrl}/v1/transactions/fiat-to-crypto`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ walletId, ...params }),
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }, [walletId, config.apiUrl, headers]);

  const cryptoToFiat = useCallback(async (params: {
    network: string; cryptoSymbol: string; amount: string;
    targetCurrency: string; targetBankAccountId: string;
  }): Promise<TransactionEntry> => {
    const res = await fetch(`${config.apiUrl}/v1/transactions/crypto-to-fiat`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ walletId, ...params }),
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }, [walletId, config.apiUrl, headers]);

  const linkExternal = useCallback(async (provider: string, chainId?: number): Promise<ExternalConnection> => {
    const res = await fetch(`${config.apiUrl}/v1/wallets/${walletId}/link-external`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ provider, chainId }),
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }, [walletId, config.apiUrl, headers]);

  const getExternalConnections = useCallback(async (): Promise<ExternalConnection[]> => {
    if (!walletId) return [];
    const res = await fetch(`${config.apiUrl}/v1/wallets/${walletId}/external-connections`, { headers: headers() });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }, [walletId, config.apiUrl, headers]);

  const unlinkExternal = useCallback(async (connectionId: string): Promise<void> => {
    await fetch(`${config.apiUrl}/v1/wallets/${walletId}/unlink-external/${connectionId}`, {
      method: 'DELETE',
      headers: headers(),
    });
  }, [walletId, config.apiUrl, headers]);

  useEffect(() => {
    if (walletId) fetchBalances();
    return () => { abortRef.current?.abort(); };
  }, [walletId, fetchBalances]);

  return {
    ...state,
    fetchBalances,
    fetchTransactions,
    sendCrypto,
    fiatToCrypto,
    cryptoToFiat,
    linkExternal,
    getExternalConnections,
    unlinkExternal,
  };
}
