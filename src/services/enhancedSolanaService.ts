
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  TransactionConfirmationStrategy,
  Commitment
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
import { TokenMetadata, TokenCreationResult } from './solanaService';

interface RPCEndpoint {
  url: string;
  name: string;
  priority: number;
}

export interface TransactionTest {
  success: boolean;
  errors?: string[];
  estimatedFee?: number;
  balanceCheck?: boolean;
  connectionStatus?: boolean;
  currentRPC?: string;
}

export class EnhancedSolanaService {
  private connection: Connection;
  private network: 'mainnet' | 'devnet';
  private metaplexService: MetaplexService;
  private static readonly TOKEN_CREATION_FEE = 0.001 * LAMPORTS_PER_SOL; // Reduced fee
  private static readonly MAINNET_MIN_BALANCE = 0.02 * LAMPORTS_PER_SOL; // Reduced minimum
  private static readonly CONFIRMATION_TIMEOUT = 60000;

  // Use single reliable RPC endpoint instead of cycling through multiple
  private static readonly MAINNET_RPC = 'https://solana-mainnet.g.alchemy.com/v2/IrmhofdwFpA4ABFafBa4g';
  private static readonly DEVNET_RPC = 'https://api.devnet.solana.com';

  constructor(network: 'mainnet' | 'devnet') {
    this.network = network;
    this.initializeConnection();
    this.metaplexService = new MetaplexService(this.connection);
  }

  private initializeConnection() {
    const rpcUrl = this.network === 'mainnet' ? 
      EnhancedSolanaService.MAINNET_RPC : 
      EnhancedSolanaService.DEVNET_RPC;
    
    this.connection = new Connection(
      rpcUrl, 
      {
        commitment: 'confirmed' as Commitment,
        confirmTransactionInitialTimeout: 30000,
        wsEndpoint: undefined,
        httpHeaders: {
          'Content-Type': 'application/json',
          'User-Agent': 'Solana-Token-Creator/1.0'
        }
      }
    );
  }

  async checkConnection(): Promise<boolean> {
    try {
      console.log(`Testing ${this.network} connection...`);
      
      // Simple connection test
      const slot = await Promise.race([
        this.connection.getSlot('confirmed'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000))
      ]);

      if (typeof slot === 'number') {
        console.log(`✅ Connected to ${this.network}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ ${this.network} connection failed:`, error);
      return false;
    }
  }

  // Simplified wallet validation
  private validateWallet(wallet: any): { isValid: boolean; error?: string } {
    if (!wallet) {
      return { isValid: false, error: 'No wallet provided' };
    }

    const publicKey = wallet.publicKey || wallet.adapter?.publicKey;
    if (!publicKey) {
      return { isValid: false, error: 'Wallet public key not found' };
    }

    const isConnected = wallet.connected !== false; // Default to true if not explicitly false
    if (!isConnected) {
      return { isValid: false, error: 'Wallet not connected' };
    }

    return { isValid: true };
  }

  async getBalance(publicKey: PublicKey | string): Promise<number> {
    const pubkey = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;
    const balance = await this.connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  }

  private getMinimumBalance(): number {
    return this.network === 'mainnet' ? 
      EnhancedSolanaService.MAINNET_MIN_BALANCE : 
      0.01 * LAMPORTS_PER_SOL;
  }

  async testTransactionReadiness(wallet: any, metadata: TokenMetadata): Promise<TransactionTest> {
    const errors: string[] = [];
    let estimatedFee = 0;

    try {
      console.log(`Testing transaction readiness on ${this.network}...`);
      
      const connectionStatus = await this.checkConnection();
      if (!connectionStatus) {
        errors.push(`Cannot connect to ${this.network}`);
        return { 
          success: false, 
          errors, 
          connectionStatus: false
        };
      }

      // Validate wallet
      const walletValidation = this.validateWallet(wallet);
      if (!walletValidation.isValid) {
        errors.push(`Wallet: ${walletValidation.error}`);
        return { 
          success: false, 
          errors, 
          connectionStatus
        };
      }

      // Get wallet public key
      const walletPublicKey = wallet.publicKey || wallet.adapter?.publicKey;
      const publicKey = typeof walletPublicKey === 'string' 
        ? new PublicKey(walletPublicKey) 
        : walletPublicKey;

      // Check balance
      const balance = await this.getBalance(publicKey);
      const requiredBalance = this.getMinimumBalance() / LAMPORTS_PER_SOL;
      const balanceCheck = balance >= requiredBalance;
      
      if (!balanceCheck) {
        errors.push(`Insufficient balance. Need ${requiredBalance.toFixed(4)} SOL, have ${balance.toFixed(4)} SOL`);
      }

      // Simple fee estimation
      estimatedFee = (EnhancedSolanaService.TOKEN_CREATION_FEE + 0.005 * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL;

      // Validate metadata
      const validations = [
        { field: 'name', validation: validateTokenName(metadata.name) },
        { field: 'symbol', validation: validateTokenSymbol(metadata.symbol) },
        { field: 'supply', validation: validateTokenSupply(metadata.supply) },
        { field: 'decimals', validation: validateDecimals(metadata.decimals) }
      ];

      validations.forEach(({ field, validation }) => {
        if (!validation.isValid) {
          errors.push(`${field}: ${validation.error}`);
        }
      });

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        estimatedFee,
        balanceCheck,
        connectionStatus
      };

    } catch (error) {
      console.error('Transaction test failed:', error);
      errors.push('Transaction validation failed');
      return { 
        success: false, 
        errors, 
        connectionStatus: false
      };
    }
  }

  async createTokenWithRetry(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    console.log(`Creating token on ${this.network}...`);
    
    if (metadata.imageBlob) {
      return await this.createTokenWithMetadata(wallet, metadata);
    } else {
      return await this.createToken(wallet, metadata);
    }
  }

  private async createToken(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    // Get wallet public key
    const walletPublicKey = wallet.publicKey || wallet.adapter?.publicKey;
    const publicKey = typeof walletPublicKey === 'string' 
      ? new PublicKey(walletPublicKey) 
      : walletPublicKey;
    
    console.log(`Creating token on ${this.network}`);
    
    // Step 1: Create mint account
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    const mintKeypair = Keypair.generate();
    const mintRent = await this.connection.getMinimumBalanceForRentExemption(82);

    const createMintTransaction = new Transaction();
    createMintTransaction.recentBlockhash = blockhash;
    createMintTransaction.feePayer = publicKey;

    // Create mint account
    createMintTransaction.add(
      SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: 82,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // Initialize mint
    createMintTransaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        metadata.decimals,
        publicKey,
        publicKey
      )
    );

    createMintTransaction.partialSign(mintKeypair);

    // Sign and send
    console.log('Requesting wallet signature for mint creation...');
    const signTransaction = wallet.signTransaction || wallet.adapter?.signTransaction;
    if (!signTransaction) {
      throw new Error('Wallet signing method not available');
    }
    
    const signedCreateTransaction = await signTransaction(createMintTransaction);
    
    const createSignature = await this.connection.sendRawTransaction(
      signedCreateTransaction.serialize(),
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    );
    
    console.log(`Mint creation transaction: ${createSignature}`);
    
    // Confirm transaction
    await this.connection.confirmTransaction({
      signature: createSignature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed');

    // Step 2: Create token account and mint tokens
    const { blockhash: mintBlockhash, lastValidBlockHeight: mintLastValidHeight } = 
      await this.connection.getLatestBlockhash('confirmed');
    
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      publicKey
    );

    const mintTransaction = new Transaction();
    mintTransaction.recentBlockhash = mintBlockhash;
    mintTransaction.feePayer = publicKey;

    // Create associated token account
    mintTransaction.add(
      createAssociatedTokenAccountInstruction(
        publicKey,
        associatedTokenAddress,
        publicKey,
        mintKeypair.publicKey
      )
    );

    // Mint tokens
    mintTransaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAddress,
        publicKey,
        metadata.supply * Math.pow(10, metadata.decimals)
      )
    );

    // Revoke authorities if requested
    if (metadata.revokeMintAuthority) {
      mintTransaction.add(
        createSetAuthorityInstruction(
          mintKeypair.publicKey,
          publicKey,
          AuthorityType.MintTokens,
          null
        )
      );
    }

    if (metadata.revokeFreezeAuthority) {
      mintTransaction.add(
        createSetAuthorityInstruction(
          mintKeypair.publicKey,
          publicKey,
          AuthorityType.FreezeAccount,
          null
        )
      );
    }

    console.log('Requesting wallet signature for token minting...');
    const signedMintTransaction = await signTransaction(mintTransaction);
    
    const mintSignature = await this.connection.sendRawTransaction(
      signedMintTransaction.serialize(),
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    );
    
    console.log(`Token minting transaction: ${mintSignature}`);
    
    await this.connection.confirmTransaction({
      signature: mintSignature,
      blockhash: mintBlockhash,
      lastValidBlockHeight: mintLastValidHeight
    }, 'confirmed');

    // Step 3: Collect fee AFTER successful token creation (optional and transparent)
    try {
      await this.collectServiceFee(wallet, publicKey);
    } catch (error) {
      console.warn('Service fee collection failed, but token was created successfully:', error);
    }

    console.log(`Token created successfully on ${this.network}!`);

    return {
      mintAddress: mintKeypair.publicKey.toBase58(),
      tokenAccountAddress: associatedTokenAddress.toBase58(),
      transactionSignature: mintSignature,
      explorerUrl: this.getExplorerUrl(mintKeypair.publicKey.toBase58())
    };
  }

  // Separate, optional fee collection
  private async collectServiceFee(wallet: any, publicKey: PublicKey): Promise<void> {
    try {
      const feeRecipient = SecurityConfig.getFeeRecipient();
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');

      const feeTransaction = new Transaction();
      feeTransaction.recentBlockhash = blockhash;
      feeTransaction.feePayer = publicKey;

      feeTransaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: feeRecipient,
          lamports: EnhancedSolanaService.TOKEN_CREATION_FEE,
        })
      );

      const signTransaction = wallet.signTransaction || wallet.adapter?.signTransaction;
      const signedFeeTransaction = await signTransaction(feeTransaction);
      
      const feeSignature = await this.connection.sendRawTransaction(
        signedFeeTransaction.serialize(),
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      );

      await this.connection.confirmTransaction({
        signature: feeSignature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      console.log('Service fee collected:', feeSignature);
    } catch (error) {
      console.warn('Fee collection failed:', error);
      throw error;
    }
  }

  private async createTokenWithMetadata(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    const result = await this.createToken(wallet, metadata);
    
    if (metadata.imageBlob) {
      try {
        const walletPublicKey = wallet.publicKey || wallet.adapter?.publicKey;
        const publicKey = typeof walletPublicKey === 'string' 
          ? new PublicKey(walletPublicKey) 
          : walletPublicKey;
        
        const metadataResult = await this.metaplexService.uploadAndCreateMetadata(
          metadata.name,
          metadata.symbol,
          metadata.description || `${metadata.name} - Created with Solana Token Generator AI`,
          metadata.imageBlob,
          new PublicKey(result.mintAddress),
          publicKey
        );
        
        result.metadataUri = metadataResult.metadataUri;
      } catch (error) {
        console.warn('Metadata upload failed, but token was created:', error);
      }
    }
    
    return result;
  }

  getExplorerUrl(address: string): string {
    const baseUrl = 'https://explorer.solana.com/address';
    const cluster = this.network === 'devnet' ? '?cluster=devnet' : '';
    return `${baseUrl}/${address}${cluster}`;
  }

  static getTokenCreationFee(): number {
    return EnhancedSolanaService.TOKEN_CREATION_FEE / LAMPORTS_PER_SOL;
  }
}
