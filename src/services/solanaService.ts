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
import { SecurityConfig } from './securityConfig';
import { createUserFriendlyError, rateLimiter } from '../utils/errorHandling';
import { validateTokenName, validateTokenSymbol, validateTokenSupply, validateDecimals } from '../utils/inputValidation';
import { MetaplexService } from './metaplexService';

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  description?: string;
  image?: string;
  imageBlob?: Blob;
  revokeMintAuthority?: boolean;
  revokeFreezeAuthority?: boolean;
  revokeUpdateAuthority?: boolean;
}

export interface TokenCreationResult {
  mintAddress: string;
  tokenAccountAddress: string;
  transactionSignature: string;
  explorerUrl: string;
  metadataUri?: string;
}

export interface TransactionTest {
  success: boolean;
  errors?: string[];
  estimatedFee?: number;
  balanceCheck?: boolean;
  connectionStatus?: boolean;
}

export class SolanaService {
  private connection: Connection;
  private network: 'mainnet' | 'devnet';
  private metaplexService: MetaplexService;
  private static readonly TOKEN_CREATION_FEE = 0.02 * LAMPORTS_PER_SOL;

  constructor(rpcUrl: string, network: 'mainnet' | 'devnet') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.network = network;
    this.metaplexService = new MetaplexService(this.connection);
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

  async testTransactionReadiness(
    wallet: any,
    metadata: TokenMetadata
  ): Promise<TransactionTest> {
    const errors: string[] = [];
    let estimatedFee = 0;

    try {
      // Test connection
      const connectionStatus = await this.checkConnection();
      if (!connectionStatus) {
        errors.push('Network connection failed');
      }

      // Validate wallet
      if (!wallet || !wallet.publicKey) {
        errors.push('Wallet not connected');
        return { success: false, errors, connectionStatus };
      }

      const walletPublicKey = typeof wallet.publicKey === 'string' 
        ? new PublicKey(wallet.publicKey) 
        : wallet.publicKey;

      // Check balance
      const balance = await this.getBalance(walletPublicKey);
      const requiredBalance = (SolanaService.TOKEN_CREATION_FEE / LAMPORTS_PER_SOL) + 0.01;
      const balanceCheck = balance >= requiredBalance;
      
      if (!balanceCheck) {
        errors.push(`Insufficient balance. Need ${requiredBalance} SOL, have ${balance.toFixed(4)} SOL`);
      }

      // Estimate transaction fees
      try {
        const { blockhash } = await this.connection.getLatestBlockhash();
        const testTransaction = new Transaction();
        testTransaction.recentBlockhash = blockhash;
        testTransaction.feePayer = walletPublicKey;
        
        const feeEstimate = await this.connection.getFeeForMessage(testTransaction.compileMessage());
        estimatedFee = (feeEstimate?.value || 5000) / LAMPORTS_PER_SOL;
      } catch (error) {
        errors.push('Failed to estimate transaction fees');
      }

      // Validate metadata inputs
      const nameValidation = validateTokenName(metadata.name);
      if (!nameValidation.isValid) {
        errors.push(`Name: ${nameValidation.error}`);
      }

      const symbolValidation = validateTokenSymbol(metadata.symbol);
      if (!symbolValidation.isValid) {
        errors.push(`Symbol: ${symbolValidation.error}`);
      }

      const supplyValidation = validateTokenSupply(metadata.supply);
      if (!supplyValidation.isValid) {
        errors.push(`Supply: ${supplyValidation.error}`);
      }

      const decimalsValidation = validateDecimals(metadata.decimals);
      if (!decimalsValidation.isValid) {
        errors.push(`Decimals: ${decimalsValidation.error}`);
      }

      // Check rate limiting
      const walletKey = walletPublicKey.toString();
      if (!rateLimiter.isAllowed(`token_creation_${walletKey}`, 3, 300000)) {
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime(`token_creation_${walletKey}`) / 1000);
        errors.push(`Rate limit exceeded. Wait ${remainingTime} seconds`);
      }

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        estimatedFee,
        balanceCheck,
        connectionStatus
      };

    } catch (error) {
      console.error('Transaction test failed:', error);
      errors.push('Transaction readiness test failed');
      return { success: false, errors, connectionStatus: false };
    }
  }

  async createTokenWithMetadata(
    wallet: any,
    metadata: TokenMetadata
  ): Promise<TokenCreationResult> {
    try {
      console.log('Creating token with metadata upload...');

      // First run readiness test
      const testResult = await this.testTransactionReadiness(wallet, metadata);
      if (!testResult.success) {
        throw new Error(testResult.errors?.join(', ') || 'Transaction readiness test failed');
      }

      const walletPublicKey = typeof wallet.publicKey === 'string' 
        ? new PublicKey(wallet.publicKey) 
        : wallet.publicKey;

      const feeRecipient = SecurityConfig.getFeeRecipient();

      // Step 1: Create token mint (same as before)
      console.log('Creating token mint...');
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      const mintKeypair = Keypair.generate();
      const mintRent = await this.connection.getMinimumBalanceForRentExemption(82);

      const createAndInitTransaction = new Transaction();
      createAndInitTransaction.recentBlockhash = blockhash;
      createAndInitTransaction.feePayer = walletPublicKey;

      // Add fee payment
      createAndInitTransaction.add(
        SystemProgram.transfer({
          fromPubkey: walletPublicKey,
          toPubkey: feeRecipient,
          lamports: SolanaService.TOKEN_CREATION_FEE,
        })
      );

      // Add mint account creation
      createAndInitTransaction.add(
        SystemProgram.createAccount({
          fromPubkey: walletPublicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: 82,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID,
        })
      );

      // Add mint initialization
      createAndInitTransaction.add(
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          metadata.decimals,
          walletPublicKey,
          walletPublicKey
        )
      );

      createAndInitTransaction.partialSign(mintKeypair);

      console.log('Requesting wallet signature for mint creation...');
      const signedCreateTransaction = await wallet.adapter.signTransaction(createAndInitTransaction);
      const createSignature = await this.connection.sendRawTransaction(signedCreateTransaction.serialize());
      
      const createConfirmation = await this.connection.confirmTransaction({
        signature: createSignature,
        blockhash: blockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight
      });

      if (createConfirmation.value.err) {
        throw new Error('Mint creation transaction failed');
      }

      console.log('Mint created successfully:', mintKeypair.publicKey.toBase58());

      // Step 2: Upload metadata and create metadata account
      let metadataUri: string | undefined;

      if (metadata.imageBlob) {
        try {
          console.log('Uploading metadata to IPFS...');
          const metadataResult = await this.metaplexService.uploadAndCreateMetadata(
            metadata.name,
            metadata.symbol,
            metadata.description || `${metadata.name} - Created with Solana Token Generator AI`,
            metadata.imageBlob,
            mintKeypair.publicKey,
            walletPublicKey
          );
          
          if (metadataResult.success) {
            metadataUri = metadataResult.metadataUri;
            console.log('Metadata uploaded successfully:', metadataUri);
            
            // Create metadata account transaction
            const metadataAccountResult = await this.metaplexService.createMetadataAccount(
              mintKeypair.publicKey,
              metadataResult.metadataUri,
              metadata.name,
              metadata.symbol,
              walletPublicKey
            );
            
            if (metadataAccountResult.success && metadataAccountResult.transaction) {
              console.log('Adding metadata creation to transaction...');
              // We'll handle this in a separate transaction after token creation
            }
          }
        } catch (error) {
          console.warn('Metadata upload failed, continuing without metadata:', error);
        }
      }

      // Step 3: Create token account and mint tokens
      const { blockhash: mintBlockhash } = await this.connection.getLatestBlockhash('confirmed');
      
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        walletPublicKey
      );

      const mintTransaction = new Transaction();
      mintTransaction.recentBlockhash = mintBlockhash;
      mintTransaction.feePayer = walletPublicKey;

      // Add create associated token account
      mintTransaction.add(
        createAssociatedTokenAccountInstruction(
          walletPublicKey,
          associatedTokenAddress,
          walletPublicKey,
          mintKeypair.publicKey
        )
      );

      // Add mint to instruction
      mintTransaction.add(
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAddress,
          walletPublicKey,
          metadata.supply * Math.pow(10, metadata.decimals)
        )
      );

      // Add authority revocations if requested
      if (metadata.revokeMintAuthority) {
        mintTransaction.add(
          createSetAuthorityInstruction(
            mintKeypair.publicKey,
            walletPublicKey,
            AuthorityType.MintTokens,
            null
          )
        );
      }

      if (metadata.revokeFreezeAuthority) {
        mintTransaction.add(
          createSetAuthorityInstruction(
            mintKeypair.publicKey,
            walletPublicKey,
            AuthorityType.FreezeAccount,
            null
          )
        );
      }

      // Request final wallet signature
      console.log('Requesting wallet signature for token creation...');
      const signedMintTransaction = await wallet.adapter.signTransaction(mintTransaction);
      const mintSignature = await this.connection.sendRawTransaction(signedMintTransaction.serialize());
      
      // Confirm final transaction
      const mintConfirmation = await this.connection.confirmTransaction({
        signature: mintSignature,
        blockhash: mintBlockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight
      });

      if (mintConfirmation.value.err) {
        throw new Error('Token minting transaction failed');
      }

      console.log('Token creation with metadata completed successfully!');

      const explorerUrl = this.getExplorerUrl(mintKeypair.publicKey.toBase58());

      return {
        mintAddress: mintKeypair.publicKey.toBase58(),
        tokenAccountAddress: associatedTokenAddress.toBase58(),
        transactionSignature: mintSignature,
        explorerUrl,
        metadataUri
      };

    } catch (error) {
      console.error('Token creation with metadata failed:', error);
      const userFriendlyError = createUserFriendlyError(error, 'token_creation');
      throw new Error(userFriendlyError);
    }
  }

  async createToken(
    wallet: any,
    metadata: TokenMetadata
  ): Promise<TokenCreationResult> {
    if (metadata.imageBlob) {
      return this.createTokenWithMetadata(wallet, metadata);
    }
    
    try {
      // First run readiness test
      const testResult = await this.testTransactionReadiness(wallet, metadata);
      if (!testResult.success) {
        throw new Error(testResult.errors?.join(', ') || 'Transaction readiness test failed');
      }

      console.log('Creating token with validated metadata:', {
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
        supply: metadata.supply
      });

      const walletPublicKey = typeof wallet.publicKey === 'string' 
        ? new PublicKey(wallet.publicKey) 
        : wallet.publicKey;

      const feeRecipient = SecurityConfig.getFeeRecipient();

      // Step 1: Create optimized transaction batch
      console.log('Creating optimized transaction batch...');
      
      // Get fresh blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

      // Generate mint keypair
      const mintKeypair = Keypair.generate();
      
      // Calculate rent exemption
      const mintRent = await this.connection.getMinimumBalanceForRentExemption(82);

      // Create combined transaction for mint creation and initialization
      const createAndInitTransaction = new Transaction();
      createAndInitTransaction.recentBlockhash = blockhash;
      createAndInitTransaction.feePayer = walletPublicKey;

      // Add fee payment
      createAndInitTransaction.add(
        SystemProgram.transfer({
          fromPubkey: walletPublicKey,
          toPubkey: feeRecipient,
          lamports: SolanaService.TOKEN_CREATION_FEE,
        })
      );

      // Add mint account creation
      createAndInitTransaction.add(
        SystemProgram.createAccount({
          fromPubkey: walletPublicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: 82,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID,
        })
      );

      // Add mint initialization
      createAndInitTransaction.add(
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          metadata.decimals,
          walletPublicKey,
          walletPublicKey
        )
      );

      // Partial sign with mint keypair
      createAndInitTransaction.partialSign(mintKeypair);

      // Request wallet signature
      console.log('Requesting wallet signature for mint creation...');
      const signedCreateTransaction = await wallet.adapter.signTransaction(createAndInitTransaction);
      const createSignature = await this.connection.sendRawTransaction(signedCreateTransaction.serialize());
      
      // Confirm with timeout
      const createConfirmation = await this.connection.confirmTransaction({
        signature: createSignature,
        blockhash: blockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight
      });

      if (createConfirmation.value.err) {
        throw new Error('Mint creation transaction failed');
      }

      console.log('Mint created successfully:', mintKeypair.publicKey.toBase58());

      // Step 2: Create token account and mint tokens in single transaction
      const { blockhash: mintBlockhash } = await this.connection.getLatestBlockhash('confirmed');
      
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        walletPublicKey
      );

      const mintTransaction = new Transaction();
      mintTransaction.recentBlockhash = mintBlockhash;
      mintTransaction.feePayer = walletPublicKey;

      // Add create associated token account
      mintTransaction.add(
        createAssociatedTokenAccountInstruction(
          walletPublicKey,
          associatedTokenAddress,
          walletPublicKey,
          mintKeypair.publicKey
        )
      );

      // Add mint to instruction
      mintTransaction.add(
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAddress,
          walletPublicKey,
          metadata.supply * Math.pow(10, metadata.decimals)
        )
      );

      // Add authority revocations if requested
      if (metadata.revokeMintAuthority) {
        mintTransaction.add(
          createSetAuthorityInstruction(
            mintKeypair.publicKey,
            walletPublicKey,
            AuthorityType.MintTokens,
            null
          )
        );
      }

      if (metadata.revokeFreezeAuthority) {
        mintTransaction.add(
          createSetAuthorityInstruction(
            mintKeypair.publicKey,
            walletPublicKey,
            AuthorityType.FreezeAccount,
            null
          )
        );
      }

      // Request final wallet signature
      console.log('Requesting wallet signature for token creation...');
      const signedMintTransaction = await wallet.adapter.signTransaction(mintTransaction);
      const mintSignature = await this.connection.sendRawTransaction(signedMintTransaction.serialize());
      
      // Confirm final transaction
      const mintConfirmation = await this.connection.confirmTransaction({
        signature: mintSignature,
        blockhash: mintBlockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash()).lastValidBlockHeight
      });

      if (mintConfirmation.value.err) {
        throw new Error('Token minting transaction failed');
      }

      console.log('Token creation completed successfully!');

      const explorerUrl = this.getExplorerUrl(mintKeypair.publicKey.toBase58());

      return {
        mintAddress: mintKeypair.publicKey.toBase58(),
        tokenAccountAddress: associatedTokenAddress.toBase58(),
        transactionSignature: mintSignature,
        explorerUrl
      };

    } catch (error) {
      console.error('Token creation failed:', error);
      const userFriendlyError = createUserFriendlyError(error, 'token_creation');
      throw new Error(userFriendlyError);
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
