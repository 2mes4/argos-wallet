import { EVMBlockchainProvider } from '@argos-wallet/network-evm';
import type { NetworkConfig } from '@argos-wallet/types';

export const POLYGON_MAINNET: NetworkConfig = {
  chainId: 137,
  name: 'Polygon',
  slug: 'polygon',
  rpcUrl: 'https://polygon-rpc.com',
  explorerUrl: 'https://polygonscan.com',
  nativeCurrency: 'POL',
  supportedTokens: [
    { symbol: 'POL', decimals: 18 },
    { symbol: 'USDC', decimals: 6, contractAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', isStablecoin: true },
    { symbol: 'EURC', decimals: 6, contractAddress: '0xE7a5dF44bFb7a235f93F54032da3b2E6569E7A43', isStablecoin: true },
    { symbol: 'USDT', decimals: 6, contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', isStablecoin: true },
  ],
};

export const POLYGON_AMOY: NetworkConfig = {
  chainId: 80002,
  name: 'Polygon Amoy (Testnet)',
  slug: 'polygon-amoy',
  rpcUrl: 'https://rpc-amoy.polygon.technology',
  explorerUrl: 'https://amoy.polygonscan.com',
  nativeCurrency: 'POL',
  supportedTokens: [
    { symbol: 'POL', decimals: 18 },
  ],
};

export function createPolygonProvider(config: {
  mnemonic: string;
  testnet?: boolean;
  rpcUrl?: string;
}): EVMBlockchainProvider {
  const network = config.testnet ? POLYGON_AMOY : POLYGON_MAINNET;
  if (config.rpcUrl) {
    network.rpcUrl = config.rpcUrl;
  }
  return new EVMBlockchainProvider({
    network,
    mnemonic: config.mnemonic,
  });
}
