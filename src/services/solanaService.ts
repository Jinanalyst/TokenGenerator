
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export interface SolanaNetwork {
  name: string;
  rpcUrl: string;
  websocketUrl: string;
  explorerUrl: string;
}

export const SOLANA_NETWORKS: Record<string, SolanaNetwork> = {
  mainnet: {
    name: 'Mainnet Beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    websocketUrl: 'wss://api.mainnet-beta.solana.com/',
    explorerUrl: 'https://explorer.solana.com'
  },
  devnet: {
    name: 'Devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    websocketUrl: 'wss://api.devnet.solana.com/',
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet'
  }
};

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  description?: string;
  image?: string;
}

export class SolanaService {
  private connection: Connection;
  private network: SolanaNetwork;

  constructor(networkKey: 'mainnet' | 'devnet' = 'devnet') {
    this.network = SOLANA_NETWORKS[networkKey];
    this.connection = new Connection(this.network.rpcUrl, 'confirmed');
  }

  async getConnection(): Promise<Connection> {
    return this.connection;
  }

  async getNetworkInfo() {
    return this.network;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const version = await this.connection.getVersion();
      console.log('Solana connection successful:', version);
      return true;
    } catch (error) {
      console.error('Failed to connect to Solana:', error);
      return false;
    }
  }

  async getBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async createToken(
    payer: Keypair,
    metadata: TokenMetadata
  ): Promise<{ mintAddress: PublicKey; signature: string }> {
    try {
      console.log('Creating token with metadata:', metadata);
      
      // Create mint account
      const mint = await createMint(
        this.connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        metadata.decimals
      );

      console.log('Token mint created:', mint.toString());

      // Get or create associated token account
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payer,
        mint,
        payer.publicKey
      );

      console.log('Token account created:', tokenAccount.address.toString());

      // Mint tokens to the account
      const mintSignature = await mintTo(
        this.connection,
        payer,
        mint,
        tokenAccount.address,
        payer.publicKey,
        metadata.totalSupply * Math.pow(10, metadata.decimals)
      );

      console.log('Tokens minted, signature:', mintSignature);

      return {
        mintAddress: mint,
        signature: mintSignature
      };
    } catch (error) {
      console.error('Failed to create token:', error);
      throw error;
    }
  }

  async simulateTokenCreation(metadata: TokenMetadata): Promise<{
    estimatedCost: number;
    mintAddress: string;
    explorerUrl: string;
  }> {
    // Simulate token creation for demo purposes
    const mockMintAddress = Keypair.generate().publicKey.toString();
    const estimatedCost = this.network.name === 'Mainnet Beta' ? 0.01 : 0.001;
    
    return {
      estimatedCost,
      mintAddress: mockMintAddress,
      explorerUrl: `${this.network.explorerUrl}/address/${mockMintAddress}`
    };
  }

  getExplorerUrl(address: string): string {
    return `${this.network.explorerUrl}/address/${address}`;
  }
}

// Singleton instances for easy access
export const mainnetService = new SolanaService('mainnet');
export const devnetService = new SolanaService('devnet');
