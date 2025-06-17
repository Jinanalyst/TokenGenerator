
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
import { TokenMetadata, TokenCreationResult, TransactionTest } from './solanaService';

interface RPCEndpoint {
  url: string;
  name: string;
  priority: number;
}

export class EnhancedSolanaService {
  private connections: Connection[] = [];
  private currentConnectionIndex = 0;
  private network: 'mainnet' | 'devnet';
  private metaplexService: MetaplexService;
  private static readonly TOKEN_CREATION_FEE = 0.02 * LAMPORTS_PER_SOL;
  private static readonly MAINNET_MIN_BALANCE = 0.05 * LAMPORTS_PER_SOL; // Higher minimum for mainnet
  private static readonly MAX_RETRIES = 3;
  private static readonly CONFIRMATION_TIMEOUT = 60000; // 60 seconds for mainnet

  // Enhanced RPC endpoints with backups
  private static readonly MAINNET_RPCS: RPCEndpoint[] = [
    { url: 'https://api.mainnet-beta.solana.com', name: 'Official', priority: 1 },
    { url: 'https://solana-api.projectserum.com', name: 'Serum', priority: 2 },
    { url: 'https://rpc.ankr.com/solana', name: 'Ankr', priority: 3 }
  ];

  private static readonly DEVNET_RPCS: RPCEndpoint[] = [
    { url: 'https://api.devnet.solana.com', name: 'Official Devnet', priority: 1 }
  ];

  constructor(network: 'mainnet' | 'devnet') {
    this.network = network;
    this.initializeConnections();
    this.metaplexService = new MetaplexService(this.getCurrentConnection());
  }

  private initializeConnections() {
    const rpcs = this.network === 'mainnet' ? 
      EnhancedSolanaService.MAINNET_RPCS : 
      EnhancedSolanaService.DEVNET_RPCS;

    this.connections = rpcs.map(rpc => new Connection(
      rpc.url, 
      {
        commitment: 'confirmed' as Commitment,
        confirmTransactionInitialTimeout: this.network === 'mainnet' ? 60000 : 30000
      }
    ));
  }

  private getCurrentConnection(): Connection {
    return this.connections[this.currentConnectionIndex] || this.connections[0];
  }

  private async switchToNextConnection(): Promise<boolean> {
    if (this.currentConnectionIndex < this.connections.length - 1) {
      this.currentConnectionIndex++;
      console.log(`Switched to RPC endpoint ${this.currentConnectionIndex + 1}`);
      return true;
    }
    return false;
  }

  async checkConnection(): Promise<boolean> {
    for (let i = 0; i < this.connections.length; i++) {
      try {
        const connection = this.connections[i];
        const version = await Promise.race([
          connection.getVersion(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 10000)
          )
        ]) as any;
        
        console.log(`Connected to Solana ${this.network} via ${EnhancedSolanaService.MAINNET_RPCS[i]?.name || 'RPC'}:`, version);
        this.currentConnectionIndex = i;
        return true;
      } catch (error) {
        console.warn(`RPC ${i + 1} failed:`, error);
        continue;
      }
    }
    return false;
  }

  async getBalance(publicKey: PublicKey | string): Promise<number> {
    const pubkey = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;
    
    for (let attempt = 0; attempt < EnhancedSolanaService.MAX_RETRIES; attempt++) {
      try {
        const balance = await this.getCurrentConnection().getBalance(pubkey);
        return balance / LAMPORTS_PER_SOL;
      } catch (error) {
        if (attempt < EnhancedSolanaService.MAX_RETRIES - 1) {
          const switched = await this.switchToNextConnection();
          if (!switched) break;
        } else {
          throw error;
        }
      }
    }
    throw new Error('Failed to get balance from all RPC endpoints');
  }

  private validateFeeRecipient(): boolean {
    try {
      const feeRecipient = SecurityConfig.getFeeRecipient();
      return PublicKey.isOnCurve(feeRecipient.toBytes());
    } catch (error) {
      console.error('Invalid fee recipient address:', error);
      return false;
    }
  }

  private getMinimumBalance(): number {
    return this.network === 'mainnet' ? 
      EnhancedSolanaService.MAINNET_MIN_BALANCE : 
      (EnhancedSolanaService.TOKEN_CREATION_FEE + 0.01 * LAMPORTS_PER_SOL);
  }

  async testTransactionReadiness(wallet: any, metadata: TokenMetadata): Promise<TransactionTest> {
    const errors: string[] = [];
    let estimatedFee = 0;

    try {
      // Enhanced connection test
      const connectionStatus = await this.checkConnection();
      if (!connectionStatus) {
        errors.push('All RPC endpoints failed - network connection issues');
        return { success: false, errors, connectionStatus };
      }

      // Validate fee recipient
      if (!this.validateFeeRecipient()) {
        errors.push('Invalid fee recipient configuration');
      }

      // Enhanced wallet validation
      if (!wallet || !wallet.publicKey || !wallet.adapter) {
        errors.push('Wallet not properly connected');
        return { success: false, errors, connectionStatus };
      }

      // Verify wallet adapter is functional
      try {
        if (!wallet.adapter.connected) {
          errors.push('Wallet adapter not connected');
        }
      } catch (error) {
        errors.push('Wallet adapter verification failed');
      }

      const walletPublicKey = typeof wallet.publicKey === 'string' 
        ? new PublicKey(wallet.publicKey) 
        : wallet.publicKey;

      // Enhanced balance check with network-specific requirements
      const balance = await this.getBalance(walletPublicKey);
      const requiredBalance = this.getMinimumBalance() / LAMPORTS_PER_SOL;
      const balanceCheck = balance >= requiredBalance;
      
      if (!balanceCheck) {
        const networkName = this.network === 'mainnet' ? 'Mainnet' : 'Devnet';
        errors.push(`Insufficient balance for ${networkName}. Need ${requiredBalance.toFixed(4)} SOL, have ${balance.toFixed(4)} SOL`);
        
        if (this.network === 'mainnet' && balance < 0.02) {
          errors.push('Mainnet token creation requires at least 0.05 SOL for fees and rent');
        }
      }

      // Enhanced fee estimation with network-specific costs
      try {
        const connection = this.getCurrentConnection();
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        const testTransaction = new Transaction();
        testTransaction.recentBlockhash = blockhash;
        testTransaction.feePayer = walletPublicKey;
        
        // Add a typical instruction to estimate real fees
        testTransaction.add(
          SystemProgram.transfer({
            fromPubkey: walletPublicKey,
            toPubkey: walletPublicKey,
            lamports: 1
          })
        );
        
        const feeEstimate = await connection.getFeeForMessage(testTransaction.compileMessage());
        const networkMultiplier = this.network === 'mainnet' ? 1.5 : 1; // Higher fees expected on mainnet
        estimatedFee = ((feeEstimate?.value || 5000) * networkMultiplier) / LAMPORTS_PER_SOL;
      } catch (error) {
        errors.push('Failed to estimate transaction fees - network congestion possible');
      }

      // Validate metadata inputs with enhanced checks
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

      // Enhanced rate limiting with network-specific limits
      const walletKey = walletPublicKey.toString();
      const rateLimit = this.network === 'mainnet' ? 2 : 3; // Stricter limits for mainnet
      const timeWindow = this.network === 'mainnet' ? 600000 : 300000; // Longer window for mainnet
      
      if (!rateLimiter.isAllowed(`token_creation_${walletKey}`, rateLimit, timeWindow)) {
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime(`token_creation_${walletKey}`) / 1000);
        errors.push(`Rate limit exceeded for ${this.network}. Wait ${remainingTime} seconds`);
      }

      // Mainnet-specific validations
      if (this.network === 'mainnet') {
        if (metadata.supply > 1000000000) {
          errors.push('Consider if such a large supply is necessary for mainnet deployment');
        }
        
        if (!metadata.revokeMintAuthority && !metadata.revokeFreezeAuthority) {
          errors.push('Warning: Consider revoking authorities for mainnet tokens to build trust');
        }
      }

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        estimatedFee,
        balanceCheck,
        connectionStatus
      };

    } catch (error) {
      console.error('Enhanced transaction test failed:', error);
      const friendlyError = this.createNetworkSpecificError(error);
      errors.push(friendlyError);
      return { success: false, errors, connectionStatus: false };
    }
  }

  private createNetworkSpecificError(error: any): string {
    const message = error?.message?.toLowerCase() || '';
    
    if (this.network === 'mainnet') {
      if (message.includes('insufficient funds') || message.includes('balance')) {
        return 'Insufficient SOL balance for mainnet transaction (need at least 0.05 SOL)';
      }
      if (message.includes('timeout') || message.includes('connection')) {
        return 'Mainnet network congestion detected - please try again in a few minutes';
      }
      if (message.includes('blockhash')) {
        return 'Mainnet blockhash expired - transaction took too long, please retry';
      }
    }
    
    return createUserFriendlyError(error, 'transaction');
  }

  async createTokenWithRetry(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    let lastError: any;
    
    for (let attempt = 0; attempt < EnhancedSolanaService.MAX_RETRIES; attempt++) {
      try {
        console.log(`Token creation attempt ${attempt + 1}/${EnhancedSolanaService.MAX_RETRIES}`);
        
        if (metadata.imageBlob) {
          return await this.createTokenWithMetadata(wallet, metadata);
        } else {
          return await this.createToken(wallet, metadata);
        }
        
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;
        
        // Don't retry on certain errors
        const errorMessage = error?.message?.toLowerCase() || '';
        if (errorMessage.includes('user rejected') || 
            errorMessage.includes('insufficient funds') ||
            errorMessage.includes('invalid')) {
          break;
        }
        
        // Switch RPC endpoint for next attempt
        if (attempt < EnhancedSolanaService.MAX_RETRIES - 1) {
          const switched = await this.switchToNextConnection();
          if (switched) {
            console.log('Switched RPC endpoint, retrying...');
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  private async createToken(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    const connection = this.getCurrentConnection();
    const walletPublicKey = typeof wallet.publicKey === 'string' 
      ? new PublicKey(wallet.publicKey) 
      : wallet.publicKey;
    const feeRecipient = SecurityConfig.getFeeRecipient();

    // Get fresh blockhash with longer timeout for mainnet
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const mintKeypair = Keypair.generate();
    const mintRent = await connection.getMinimumBalanceForRentExemption(82);

    // Create optimized transaction for the network
    const createAndInitTransaction = new Transaction();
    createAndInitTransaction.recentBlockhash = blockhash;
    createAndInitTransaction.feePayer = walletPublicKey;

    // Add fee payment
    createAndInitTransaction.add(
      SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: feeRecipient,
        lamports: EnhancedSolanaService.TOKEN_CREATION_FEE,
      })
    );

    // Add mint account creation and initialization
    createAndInitTransaction.add(
      SystemProgram.createAccount({
        fromPubkey: walletPublicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: 82,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    createAndInitTransaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        metadata.decimals,
        walletPublicKey,
        walletPublicKey
      )
    );

    createAndInitTransaction.partialSign(mintKeypair);

    // Enhanced transaction sending with proper confirmation
    console.log('Requesting wallet signature for mint creation...');
    const signedCreateTransaction = await wallet.adapter.signTransaction(createAndInitTransaction);
    
    const createSignature = await connection.sendRawTransaction(
      signedCreateTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: this.network === 'mainnet' ? 3 : 1
      }
    );
    
    // Enhanced confirmation with network-specific timeout
    const confirmationStrategy: TransactionConfirmationStrategy = {
      signature: createSignature,
      blockhash,
      lastValidBlockHeight
    };
    
    const createConfirmation = await connection.confirmTransaction(
      confirmationStrategy,
      'confirmed'
    );

    if (createConfirmation.value.err) {
      throw new Error(`Mint creation failed: ${createConfirmation.value.err}`);
    }

    console.log('Mint created successfully:', mintKeypair.publicKey.toBase58());

    // Continue with token account creation and minting...
    const { blockhash: mintBlockhash, lastValidBlockHeight: mintLastValidHeight } = 
      await connection.getLatestBlockhash('confirmed');
    
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      walletPublicKey
    );

    const mintTransaction = new Transaction();
    mintTransaction.recentBlockhash = mintBlockhash;
    mintTransaction.feePayer = walletPublicKey;

    mintTransaction.add(
      createAssociatedTokenAccountInstruction(
        walletPublicKey,
        associatedTokenAddress,
        walletPublicKey,
        mintKeypair.publicKey
      )
    );

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

    console.log('Requesting wallet signature for token creation...');
    const signedMintTransaction = await wallet.adapter.signTransaction(mintTransaction);
    
    const mintSignature = await connection.sendRawTransaction(
      signedMintTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: this.network === 'mainnet' ? 3 : 1
      }
    );
    
    const mintConfirmationStrategy: TransactionConfirmationStrategy = {
      signature: mintSignature,
      blockhash: mintBlockhash,
      lastValidBlockHeight: mintLastValidHeight
    };
    
    const mintConfirmation = await connection.confirmTransaction(
      mintConfirmationStrategy,
      'confirmed'
    );

    if (mintConfirmation.value.err) {
      throw new Error(`Token minting failed: ${mintConfirmation.value.err}`);
    }

    console.log('Token creation completed successfully!');

    return {
      mintAddress: mintKeypair.publicKey.toBase58(),
      tokenAccountAddress: associatedTokenAddress.toBase58(),
      transactionSignature: mintSignature,
      explorerUrl: this.getExplorerUrl(mintKeypair.publicKey.toBase58())
    };
  }

  private async createTokenWithMetadata(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    // Similar implementation to createToken but with metadata upload
    // This would follow the same pattern with enhanced error handling and retries
    const result = await this.createToken(wallet, metadata);
    
    if (metadata.imageBlob) {
      try {
        const metadataResult = await this.metaplexService.uploadAndCreateMetadata(
          metadata.name,
          metadata.symbol,
          metadata.description || `${metadata.name} - Created with Solana Token Generator AI`,
          metadata.imageBlob,
          new PublicKey(result.mintAddress),
          typeof wallet.publicKey === 'string' ? new PublicKey(wallet.publicKey) : wallet.publicKey
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

