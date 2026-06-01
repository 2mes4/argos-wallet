import { EVMBlockchainProvider } from '@argos-wallet/network-evm';
import type { NetworkConfig } from '@argos-wallet/types';

export const ETHEREUM_MAINNET: NetworkConfig = {
  chainId: 1,
  name: 'Ethereum',
  slug: 'ethereum',
  rpcUrl: 'https://eth.llamarpc.com',
  explorerUrl: 'https://etherscan.io',
  nativeCurrency: 'ETH',
  supportedTokens: [
    { symbol: 'ETH', decimals: 18 },
    { symbol: 'USDC', decimals: 6, contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', isStablecoin: true },
    { symbol: 'USDT', decimals: 6, contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', isStablecoin: true },
    { symbol: 'EURC', decimals: 6, contractAddress: '0x1aBaEA1f7C830Bd89Acc67eC4af516284b1bC33c', isStablecoin: true },
  ],
};

export const ETHEREUM_SEPOLIA: NetworkConfig = {
  chainId: 11155111,
  name: 'Ethereum Sepolia (Testnet)',
  slug: 'ethereum-sepolia',
  rpcUrl: 'https://rpc.sepolia.org',
  explorerUrl: 'https://sepolia.etherscan.io',
  nativeCurrency: 'ETH',
  supportedTokens: [
    { symbol: 'ETH', decimals: 18 },
  ],
};

export function createEthereumProvider(config: {
  mnemonic: string;
  testnet?: boolean;
  rpcUrl?: string;
}): EVMBlockchainProvider {
  const network = config.testnet ? ETHEREUM_SEPOLIA : ETHEREUM_MAINNET;
  if (config.rpcUrl) {
    network.rpcUrl = config.rpcUrl;
  }
  return new EVMBlockchainProvider({
    network,
    mnemonic: config.mnemonic,
  });
}
