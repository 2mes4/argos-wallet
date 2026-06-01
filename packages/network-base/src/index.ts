import { EVMBlockchainProvider } from '@argos-wallet/network-evm';
import type { NetworkConfig } from '@argos-wallet/types';

export const BASE_MAINNET: NetworkConfig = {
  chainId: 8453,
  name: 'Base',
  slug: 'base',
  rpcUrl: 'https://mainnet.base.org',
  explorerUrl: 'https://basescan.org',
  nativeCurrency: 'ETH',
  supportedTokens: [
    { symbol: 'ETH', decimals: 18 },
    { symbol: 'USDC', decimals: 6, contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', isStablecoin: true },
    { symbol: 'EURC', decimals: 6, contractAddress: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42', isStablecoin: true },
    { symbol: 'USDbC', decimals: 6, contractAddress: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', isStablecoin: true },
  ],
};

export const BASE_SEPOLIA: NetworkConfig = {
  chainId: 84532,
  name: 'Base Sepolia (Testnet)',
  slug: 'base-sepolia',
  rpcUrl: 'https://sepolia.base.org',
  explorerUrl: 'https://sepolia.basescan.org',
  nativeCurrency: 'ETH',
  supportedTokens: [
    { symbol: 'ETH', decimals: 18 },
  ],
};

export function createBaseProvider(config: {
  mnemonic: string;
  testnet?: boolean;
  rpcUrl?: string;
}): EVMBlockchainProvider {
  const network = config.testnet ? BASE_SEPOLIA : BASE_MAINNET;
  if (config.rpcUrl) {
    network.rpcUrl = config.rpcUrl;
  }
  return new EVMBlockchainProvider({
    network,
    mnemonic: config.mnemonic,
  });
}
