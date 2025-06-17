
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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction
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

  async getBalance(publicKey: PublicKey | string): Promise<number> {
    const pubkey = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;
    const balance = await this.connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  }

  async createToken(
    wallet: any,
    metadata: TokenMetadata
  ): Promise<TokenCreationResult> {
    try {
      console.log('Creating token with metadata:', metadata);

      // Ensure wallet publicKey is a PublicKey object
      const walletPublicKey = typeof wallet.publicKey === 'string' 
        ? new PublicKey(wallet.publicKey) 
        : wallet.publicKey;
      
      // Check if payer has enough balance for fee + transaction costs
      const payerBalance = await this.getBalance(walletPublicKey);
      const requiredBalance = (SolanaService.TOKEN_CREATION_FEE / LAMPORTS_PER_SOL) + 0.01; // 0.01 SOL buffer for transaction costs
      
      if (payerBalance < requiredBalance) {
        throw new Error(`Insufficient balance. Need at least ${requiredBalance} SOL, but have ${payerBalance} SOL`);
      }

      // Step 1: Create and send fee payment transaction
      console.log('Sending token creation fee of 0.02 SOL...');
      const feeTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: walletPublicKey,
          toPubkey: SolanaService.FEE_RECIPIENT,
          lamports: SolanaService.TOKEN_CREATION_FEE,
        })
      );

      const { blockhash } = await this.connection.getLatestBlockhash();
      feeTransaction.recentBlockhash = blockhash;
      feeTransaction.feePayer = walletPublicKey;

      const signedFeeTransaction = await wallet.adapter.signTransaction(feeTransaction);
      const feeSignature = await this.connection.sendRawTransaction(signedFeeTransaction.serialize());
      await this.connection.confirmTransaction(feeSignature);
      console.log('Fee payment confirmed:', feeSignature);

      // Step 2: Create mint account and initialize
      const mintKeypair = Keypair.generate();
      const mintRent = await this.connection.getMinimumBalanceForRentExemption(82);
      
      const createMintTransaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: walletPublicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: 82,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          metadata.decimals,
          walletPublicKey, // mint authority
          walletPublicKey  // freeze authority
        )
      );

      const { blockhash: mintBlockhash } = await this.connection.getLatestBlockhash();
      createMintTransaction.recentBlockhash = mintBlockhash;
      createMintTransaction.feePayer = walletPublicKey;
      createMintTransaction.partialSign(mintKeypair);

      const signedMintTransaction = await wallet.adapter.signTransaction(createMintTransaction);
      const mintSignature = await this.connection.sendRawTransaction(signedMintTransaction.serialize());
      await this.connection.confirmTransaction(mintSignature);
      console.log('Mint created:', mintKeypair.publicKey.toBase58());

      // Step 3: Create associated token account
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        walletPublicKey
      );

      const createTokenAccountTransaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          walletPublicKey, // payer
          associatedTokenAddress, // associated token account
          walletPublicKey, // owner
          mintKeypair.publicKey // mint
        )
      );

      const { blockhash: tokenAccountBlockhash } = await this.connection.getLatestBlockhash();
      createTokenAccountTransaction.recentBlockhash = tokenAccountBlockhash;
      createTokenAccountTransaction.feePayer = walletPublicKey;

      const signedTokenAccountTransaction = await wallet.adapter.signTransaction(createTokenAccountTransaction);
      const tokenAccountSignature = await this.connection.sendRawTransaction(signedTokenAccountTransaction.serialize());
      await this.connection.confirmTransaction(tokenAccountSignature);
      console.log('Token account created:', associatedTokenAddress.toBase58());

      // Step 4: Mint tokens to the associated token account
      const mintToTransaction = new Transaction().add(
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAddress,
          walletPublicKey, // mint authority
          metadata.supply * Math.pow(10, metadata.decimals)
        )
      );

      const { blockhash: mintToBlockhash } = await this.connection.getLatestBlockhash();
      mintToTransaction.recentBlockhash = mintToBlockhash;
      mintToTransaction.feePayer = walletPublicKey;

      const signedMintToTransaction = await wallet.adapter.signTransaction(mintToTransaction);
      const mintToSignature = await this.connection.sendRawTransaction(signedMintToTransaction.serialize());
      await this.connection.confirmTransaction(mintToSignature);
      console.log('Tokens minted, signature:', mintToSignature);

      // Step 5: Handle authority revocations if requested
      if (metadata.revokeMintAuthority || metadata.revokeFreezeAuthority) {
        const revokeTransaction = new Transaction();

        if (metadata.revokeMintAuthority) {
          console.log('Revoking mint authority...');
          revokeTransaction.add(
            createSetAuthorityInstruction(
              mintKeypair.publicKey,
              walletPublicKey, // current authority
              AuthorityType.MintTokens,
              null // new authority (null = revoke)
            )
          );
        }

        if (metadata.revokeFreezeAuthority) {
          console.log('Revoking freeze authority...');
          revokeTransaction.add(
            createSetAuthorityInstruction(
              mintKeypair.publicKey,
              walletPublicKey, // current authority
              AuthorityType.FreezeAccount,
              null // new authority (null = revoke)
            )
          );
        }

        if (revokeTransaction.instructions.length > 0) {
          const { blockhash: revokeBlockhash } = await this.connection.getLatestBlockhash();
          revokeTransaction.recentBlockhash = revokeBlockhash;
          revokeTransaction.feePayer = walletPublicKey;

          const signedRevokeTransaction = await wallet.adapter.signTransaction(revokeTransaction);
          const revokeSignature = await this.connection.sendRawTransaction(signedRevokeTransaction.serialize());
          await this.connection.confirmTransaction(revokeSignature);
          console.log('Authorities revoked:', revokeSignature);
        }
      }

      const explorerUrl = this.getExplorerUrl(mintKeypair.publicKey.toBase58());

      return {
        mintAddress: mintKeypair.publicKey.toBase58(),
        tokenAccountAddress: associatedTokenAddress.toBase58(),
        transactionSignature: mintToSignature,
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
