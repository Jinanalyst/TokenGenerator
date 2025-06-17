
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  AuthorityType,
  setAuthority,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  description?: string;
  image?: string;
  revokeMintAuthority?: boolean;
  revokeFreezeAuthority?: boolean;
  revokeUpdateAuthority?: boolean;
}

export interface TokenCreationResult {
  mintAddress: string;
  tokenAccountAddress: string;
  transactionSignature: string;
  explorerUrl: string;
}

export class SolanaService {
  private connection: Connection;
  private network: 'mainnet' | 'devnet';
  private static readonly TOKEN_CREATION_FEE = 0.02 * LAMPORTS_PER_SOL; // 0.02 SOL in lamports
  private static readonly FEE_RECIPIENT = new PublicKey('2zmewxtyL83t6WLkSPpQtdDiK5Nmd5KSn71HKC7TEGcU');

  constructor(rpcUrl: string, network: 'mainnet' | 'devnet') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.network = network;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const version = await this.connection.getVersion();
      console.log(`Connected to Solana ${this.network}:`, version);
      return true;
    } catch (error) {
      console.error('Solana connection failed:', error);
      return false;
    }
  }

  async getBalance(publicKey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async createToken(
    payer: Keypair,
    metadata: TokenMetadata
  ): Promise<TokenCreationResult> {
    try {
      console.log('Creating token with metadata:', metadata);

      // Check if payer has enough balance for fee + transaction costs
      const payerBalance = await this.getBalance(payer.publicKey);
      const requiredBalance = (SolanaService.TOKEN_CREATION_FEE / LAMPORTS_PER_SOL) + 0.01; // 0.01 SOL buffer for transaction costs
      
      if (payerBalance < requiredBalance) {
        throw new Error(`Insufficient balance. Need at least ${requiredBalance} SOL, but have ${payerBalance} SOL`);
      }

      // Create and send fee payment transaction
      console.log('Sending token creation fee of 0.02 SOL...');
      const feeTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: SolanaService.FEE_RECIPIENT,
          lamports: SolanaService.TOKEN_CREATION_FEE,
        })
      );

      const feeSignature = await sendAndConfirmTransaction(
        this.connection,
        feeTransaction,
        [payer]
      );

      console.log('Fee payment confirmed:', feeSignature);

      // Create mint account
      const mintKeypair = Keypair.generate();
      const mint = await createMint(
        this.connection,
        payer,
        payer.publicKey, // mint authority
        payer.publicKey, // freeze authority (will be revoked if requested)
        metadata.decimals,
        mintKeypair
      );

      console.log('Mint created:', mint.toBase58());

      // Create associated token account for the payer
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payer,
        mint,
        payer.publicKey
      );

      console.log('Token account created:', tokenAccount.address.toBase58());

      // Mint tokens to the token account
      const mintSignature = await mintTo(
        this.connection,
        payer,
        mint,
        tokenAccount.address,
        payer,
        metadata.supply * Math.pow(10, metadata.decimals)
      );

      console.log('Tokens minted, signature:', mintSignature);

      // Revoke authorities if requested
      const revokeSignatures: string[] = [];

      if (metadata.revokeMintAuthority) {
        const revokeMintSig = await setAuthority(
          this.connection,
          payer,
          mint,
          payer,
          AuthorityType.MintTokens,
          null
        );
        revokeSignatures.push(revokeMintSig);
        console.log('Mint authority revoked:', revokeMintSig);
      }

      if (metadata.revokeFreezeAuthority) {
        const revokeFreezeSig = await setAuthority(
          this.connection,
          payer,
          mint,
          payer,
          AuthorityType.FreezeAccount,
          null
        );
        revokeSignatures.push(revokeFreezeSig);
        console.log('Freeze authority revoked:', revokeFreezeSig);
      }

      const explorerUrl = this.getExplorerUrl(mint.toBase58());

      return {
        mintAddress: mint.toBase58(),
        tokenAccountAddress: tokenAccount.address.toBase58(),
        transactionSignature: mintSignature,
        explorerUrl
      };

    } catch (error) {
      console.error('Token creation failed:', error);
      throw new Error(`Token creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getExplorerUrl(address: string): string {
    const baseUrl = 'https://explorer.solana.com/address';
    const cluster = this.network === 'devnet' ? '?cluster=devnet' : '';
    return `${baseUrl}/${address}${cluster}`;
  }

  getRaydiumUrl(mintAddress: string): string {
    const baseUrl = this.network === 'mainnet' 
      ? 'https://raydium.io/liquidity/create'
      : 'https://raydium.io/liquidity/create/?cluster=devnet';
    return `${baseUrl}/?token=${mintAddress}`;
  }

  // Legacy method for backward compatibility
  async simulateTokenCreation(metadata: TokenMetadata) {
    return {
      success: true,
      message: 'Use createToken method for real token creation',
      metadata
    };
  }

  static getTokenCreationFee(): number {
    return SolanaService.TOKEN_CREATION_FEE / LAMPORTS_PER_SOL;
  }
}

// Service instances
export const mainnetService = new SolanaService(
  'https://api.mainnet-beta.solana.com',
  'mainnet'
);

export const devnetService = new SolanaService(
  'https://api.devnet.solana.com',
  'devnet'
);
