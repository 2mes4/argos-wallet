import type {
  IBlockchainProvider,
  NetworkConfig,
  WalletAccount,
  TransactionResult,
  GasConfig,
} from '@argos-wallet/types';
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  type PublicClient,
  type Hex,
  type Chain,
  type Account,
} from 'viem';
import { mnemonicToAccount, type HDAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const;

export interface EVMProviderConfig {
  network: NetworkConfig;
  mnemonic: string;
  derivationPath?: string;
  treasuryAddress?: Hex;
}

function buildChain(config: NetworkConfig): Chain {
  return {
    id: config.chainId,
    name: config.name,
    nativeCurrency: {
      name: config.nativeCurrency,
      symbol: config.nativeCurrency,
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [config.rpcUrl] },
    },
    blockExplorers: config.explorerUrl
      ? { default: { name: 'Explorer', url: config.explorerUrl } }
      : undefined,
  } as Chain;
}

export class EVMBlockchainProvider implements IBlockchainProvider {
  readonly networkSlug: string;
  readonly config: NetworkConfig;

  private chain: Chain;
  private publicClient: PublicClient;
  private mainAccount: HDAccount;
  private walletClient: ReturnType<typeof createWalletClient>;
  private derivationPath: string;
  private walletCache = new Map<string, WalletAccount>();
  private tokenDecimals = new Map<string, number>();

  constructor(private providerConfig: EVMProviderConfig) {
    this.config = providerConfig.network;
    this.networkSlug = providerConfig.network.slug;
    this.derivationPath = providerConfig.derivationPath ?? "m/44'/60'/0'/0";

    this.chain = buildChain(this.config);

    this.mainAccount = mnemonicToAccount(providerConfig.mnemonic, {
      path: this.derivationPath as `m/44'/60'/${string}`,
    });

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(this.config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.mainAccount as Account,
      chain: this.chain,
      transport: http(this.config.rpcUrl),
    });
  }

  async initialize(_config: NetworkConfig): Promise<void> {
    for (const token of this.config.supportedTokens) {
      if (token.decimals) {
        this.tokenDecimals.set(token.symbol, token.decimals);
      }
    }
  }

  async getOrCreateWallet(walletId: string): Promise<WalletAccount> {
    const cached = this.walletCache.get(walletId);
    if (cached) return cached;

    const derivedAccount = this.getDerivedAccount(walletId);

    const walletAccount: WalletAccount = {
      address: derivedAccount.address,
      publicKey: derivedAccount.publicKey,
    };

    this.walletCache.set(walletId, walletAccount);
    return walletAccount;
  }

  async getBalance(address: string, tokenSymbol: string): Promise<string> {
    if (tokenSymbol === this.config.nativeCurrency) {
      const balance = await this.publicClient.getBalance({ address: address as Hex });
      return formatUnits(balance, 18);
    }

    const tokenConfig = this.config.supportedTokens.find((t) => t.symbol === tokenSymbol);
    if (!tokenConfig?.contractAddress) {
      throw new Error(`Token ${tokenSymbol} not configured for ${this.networkSlug}`);
    }

    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address as Hex],
    });

    const result = await this.publicClient.call({
      to: tokenConfig.contractAddress as Hex,
      data,
    });

    if (!result.data) return '0';

    const decimals = tokenConfig.decimals ?? 18;
    const balance = BigInt(result.data);
    return formatUnits(balance, decimals);
  }

  async transferTokens(
    _fromAddress: string,
    toAddress: string,
    amount: string,
    tokenSymbol: string,
    _gasConfig?: GasConfig,
  ): Promise<TransactionResult> {
    if (tokenSymbol === this.config.nativeCurrency) {
      return this.transferNative(toAddress, amount);
    }

    return this.transferERC20(toAddress, amount, tokenSymbol);
  }

  async executeSmartContract(
    walletId: string,
    contractAddress: string,
    abi: unknown[],
    method: string,
    args: unknown[],
    value?: string,
    _gasConfig?: GasConfig,
  ): Promise<TransactionResult> {
    const derivedAccount = this.getDerivedAccount(walletId);

    const client = createWalletClient({
      account: derivedAccount as Account,
      chain: this.chain,
      transport: http(this.config.rpcUrl),
    });

    const data = encodeFunctionData({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: abi as any,
      functionName: method,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: args as any,
    });

    const txHash = await client.sendTransaction({
      to: contractAddress as Hex,
      data,
      value: value ? parseUnits(value, 18) : undefined,
    });

    return {
      txHash,
      status: 'PENDING',
    };
  }

  async signMessage(walletId: string, message: string): Promise<string> {
    const derivedAccount = this.getDerivedAccount(walletId);
    const client = createWalletClient({
      account: derivedAccount as Account,
      chain: this.chain,
      transport: http(this.config.rpcUrl),
    });

    return client.signMessage({ message });
  }

  async getTransactionStatus(txHash: string): Promise<TransactionResult> {
    const receipt = await this.publicClient.getTransactionReceipt({
      hash: txHash as Hex,
    });

    if (!receipt) {
      return { txHash, status: 'PENDING' };
    }

    return {
      txHash,
      blockNumber: Number(receipt.blockNumber),
      status: receipt.status === 'success' ? 'SUCCESS' : 'FAILED',
    };
  }

  async destroy(): Promise<void> {
    this.walletCache.clear();
    this.tokenDecimals.clear();
  }

  private async transferNative(to: string, amount: string): Promise<TransactionResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txHash = await (this.walletClient.sendTransaction as any)({
      to: to as Hex,
      value: parseUnits(amount, 18),
    });

    return { txHash: txHash as Hex, status: 'PENDING' };
  }

  private async transferERC20(
    to: string,
    amount: string,
    tokenSymbol: string,
  ): Promise<TransactionResult> {
    const tokenConfig = this.config.supportedTokens.find((t) => t.symbol === tokenSymbol);
    if (!tokenConfig?.contractAddress) {
      throw new Error(`Token ${tokenSymbol} not found`);
    }

    const decimals = tokenConfig.decimals ?? 18;

    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to as Hex, parseUnits(amount, decimals)],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txHash = await (this.walletClient.sendTransaction as any)({
      to: tokenConfig.contractAddress as Hex,
      data,
    });

    return { txHash: txHash as Hex, status: 'PENDING' };
  }

  private hashWalletIdToIndex(walletId: string): number {
    let hash = 0;
    for (let i = 0; i < walletId.length; i++) {
      const char = walletId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 10000;
  }

  private getDerivedAccount(walletId: string): HDAccount {
    const index = this.hashWalletIdToIndex(walletId);
    const path = `${this.derivationPath}/${index}` as `m/44'/60'/${string}`;
    return mnemonicToAccount(this.providerConfig.mnemonic, { path });
  }
}
