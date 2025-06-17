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
  private rpcEndpoints: RPCEndpoint[] = [];
  private currentConnectionIndex = 0;
  private network: 'mainnet' | 'devnet';
  private metaplexService: MetaplexService;
  private static readonly TOKEN_CREATION_FEE = 0.02 * LAMPORTS_PER_SOL;
  private static readonly MAINNET_MIN_BALANCE = 0.05 * LAMPORTS_PER_SOL;
  private static readonly MAX_RETRIES = 3;
  private static readonly CONFIRMATION_TIMEOUT = 60000;

  // Enhanced RPC endpoints with working mainnet RPCs
  private static readonly MAINNET_RPCS: RPCEndpoint[] = [
    { url: 'https://mainnet.helius-rpc.com/?api-key=02b6df6c-8f47-4ce3-8d4b-3b1cc7b89e94', name: 'Helius RPC', priority: 1 },
    { url: 'https://api.mainnet-beta.solana.com', name: 'Official Mainnet', priority: 2 },
    { url: 'https://rpc.ankr.com/solana', name: 'Ankr', priority: 3 },
    { url: 'https://solana-mainnet.g.alchemy.com/v2/demo', name: 'Alchemy Demo', priority: 4 }
  ];

  private static readonly DEVNET_RPCS: RPCEndpoint[] = [
    { url: 'https://api.devnet.solana.com', name: 'Official Devnet', priority: 1 },
    { url: 'https://devnet.helius-rpc.com/?api-key=02b6df6c-8f47-4ce3-8d4b-3b1cc7b89e94', name: 'Helius Devnet', priority: 2 }
  ];

  constructor(network: 'mainnet' | 'devnet') {
    this.network = network;
    this.rpcEndpoints = network === 'mainnet' ? 
      EnhancedSolanaService.MAINNET_RPCS : 
      EnhancedSolanaService.DEVNET_RPCS;
    this.initializeConnections();
    this.metaplexService = new MetaplexService(this.getCurrentConnection());
  }

  private initializeConnections() {
    this.connections = this.rpcEndpoints.map(rpc => new Connection(
      rpc.url, 
      {
        commitment: 'confirmed' as Commitment,
        confirmTransactionInitialTimeout: this.network === 'mainnet' ? 120000 : 30000,
        wsEndpoint: undefined,
        httpHeaders: {
          'Content-Type': 'application/json',
          'User-Agent': 'Solana-Token-Creator/1.0'
        },
        fetch: (url, options) => {
          console.log(`Making request to: ${url}`);
          return fetch(url, {
            ...options,
            timeout: 15000 // 15 second timeout
          });
        }
      }
    ));
  }

  private getCurrentConnection(): Connection {
    return this.connections[this.currentConnectionIndex] || this.connections[0];
  }

  private getCurrentEndpointName(): string {
    return this.rpcEndpoints[this.currentConnectionIndex]?.name || 'Unknown RPC';
  }

  private async switchToNextConnection(): Promise<boolean> {
    if (this.currentConnectionIndex < this.connections.length - 1) {
      this.currentConnectionIndex++;
      console.log(`Switched to ${this.getCurrentEndpointName()}`);
      return true;
    }
    return false;
  }

  async checkConnection(): Promise<boolean> {
    console.log(`Testing ${this.network} connections...`);
    
    for (let i = 0; i < this.connections.length; i++) {
      try {
        const connection = this.connections[i];
        const endpointName = this.rpcEndpoints[i]?.name || `RPC ${i + 1}`;
        
        console.log(`Testing ${endpointName}...`);
        
        // Test with getEpochInfo instead of getVersion for better reliability
        const epochPromise = connection.getEpochInfo();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
        );
        
        const epochInfo = await Promise.race([epochPromise, timeoutPromise]) as any;
        
        // Additional test - try to get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        
        console.log(`✅ Connected to ${this.network} via ${endpointName} (Epoch: ${epochInfo.epoch})`);
        this.currentConnectionIndex = i;
        return true;
        
      } catch (error) {
        const endpointName = this.rpcEndpoints[i]?.name || `RPC ${i + 1}`;
        console.warn(`❌ ${endpointName} failed:`, error instanceof Error ? error.message : 'Unknown error');
        continue;
      }
    }
    
    console.error(`❌ All ${this.network} RPC endpoints failed`);
    return false;
  }

  async getBalance(publicKey: PublicKey | string): Promise<number> {
    const pubkey = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;
    
    for (let attempt = 0; attempt < EnhancedSolanaService.MAX_RETRIES; attempt++) {
      try {
        const balance = await this.getCurrentConnection().getBalance(pubkey);
        return balance / LAMPORTS_PER_SOL;
      } catch (error) {
        console.warn(`Balance check attempt ${attempt + 1} failed:`, error);
        
        if (attempt < EnhancedSolanaService.MAX_RETRIES - 1) {
          const switched = await this.switchToNextConnection();
          if (!switched) {
            console.error('No more RPC endpoints to try for balance check');
            break;
          }
        }
      }
    }
    throw new Error(`Failed to get balance from all available ${this.network} RPC endpoints`);
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
      console.log(`Testing transaction readiness on ${this.network}...`);
      
      // Enhanced connection test with specific error handling
      const connectionStatus = await this.checkConnection();
      if (!connectionStatus) {
        errors.push(`Cannot connect to ${this.network} - all RPC endpoints are failing. This could be due to network congestion or RPC issues.`);
        return { success: false, errors, connectionStatus };
      }

      console.log(`✅ Successfully connected to ${this.network} via ${this.getCurrentEndpointName()}`);

      // Validate fee recipient
      if (!this.validateFeeRecipient()) {
        errors.push('Fee recipient configuration is invalid');
      }

      // Enhanced wallet validation
      if (!wallet || !wallet.publicKey || !wallet.adapter) {
        errors.push('Wallet not properly connected - please disconnect and reconnect your wallet');
        return { success: false, errors, connectionStatus };
      }

      // Verify wallet adapter is functional
      try {
        if (!wallet.adapter.connected || !wallet.adapter.publicKey) {
          errors.push('Wallet adapter not properly connected - please refresh page and reconnect');
        }
      } catch (error) {
        console.error('Wallet adapter check failed:', error);
        errors.push('Wallet adapter verification failed - try refreshing and reconnecting your wallet');
      }

      const walletPublicKey = typeof wallet.publicKey === 'string' 
        ? new PublicKey(wallet.publicKey) 
        : wallet.publicKey;

      // Enhanced balance check with network-specific requirements
      console.log('Checking wallet balance...');
      const balance = await this.getBalance(walletPublicKey);
      const requiredBalance = this.getMinimumBalance() / LAMPORTS_PER_SOL;
      const balanceCheck = balance >= requiredBalance;
      
      console.log(`Wallet balance: ${balance} SOL, Required: ${requiredBalance} SOL`);
      
      if (!balanceCheck) {
        const networkName = this.network === 'mainnet' ? 'Mainnet' : 'Devnet';
        errors.push(`Insufficient balance for ${networkName}. Need ${requiredBalance.toFixed(4)} SOL, have ${balance.toFixed(4)} SOL`);
        
        if (this.network === 'mainnet' && balance < 0.05) {
          errors.push('Mainnet token creation requires at least 0.05 SOL for fees and rent exemption');
        }
      }

      // Enhanced fee estimation with better error handling
      try {
        const connection = this.getCurrentConnection();
        console.log('Getting latest blockhash for fee estimation...');
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        const testTransaction = new Transaction();
        testTransaction.recentBlockhash = blockhash;
        testTransaction.feePayer = walletPublicKey;
        
        // Add typical instructions to estimate real fees
        testTransaction.add(
          SystemProgram.transfer({
            fromPubkey: walletPublicKey,
            toPubkey: walletPublicKey,
            lamports: 1
          })
        );
        
        console.log('Estimating transaction fees...');
        const feeEstimate = await connection.getFeeForMessage(testTransaction.compileMessage());
        const networkMultiplier = this.network === 'mainnet' ? 3 : 1; // Higher fees expected on mainnet
        estimatedFee = ((feeEstimate?.value || 10000) * networkMultiplier) / LAMPORTS_PER_SOL;
        console.log(`Estimated fees: ${estimatedFee} SOL`);
      } catch (error) {
        console.warn('Fee estimation failed:', error);
        errors.push(`Failed to estimate transaction fees on ${this.network} - this could indicate network congestion`);
      }

      // Validate metadata inputs
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

      // Rate limiting with network-specific limits
      const walletKey = walletPublicKey.toString();
      const rateLimit = this.network === 'mainnet' ? 2 : 3;
      const timeWindow = this.network === 'mainnet' ? 600000 : 300000;
      
      if (!rateLimiter.isAllowed(`token_creation_${walletKey}`, rateLimit, timeWindow)) {
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime(`token_creation_${walletKey}`) / 1000);
        errors.push(`Rate limit exceeded for ${this.network}. Please wait ${remainingTime} seconds before trying again`);
      }

      // Mainnet-specific validations
      if (this.network === 'mainnet') {
        if (metadata.supply > 1000000000) {
          errors.push('Consider if such a large supply is necessary for mainnet deployment');
        }
      }

      const testResult = {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        estimatedFee,
        balanceCheck,
        connectionStatus,
        currentRPC: this.getCurrentEndpointName()
      };

      console.log(`Transaction test completed:`, testResult);
      return testResult;

    } catch (error) {
      console.error('Enhanced transaction test failed:', error);
      const friendlyError = this.createNetworkSpecificError(error);
      errors.push(friendlyError);
      return { success: false, errors, connectionStatus: false };
    }
  }

  private createNetworkSpecificError(error: any): string {
    const message = error?.message?.toLowerCase() || '';
    
    console.log('Creating network-specific error for:', message);
    
    if (this.network === 'mainnet') {
      if (message.includes('insufficient funds') || message.includes('balance')) {
        return 'Insufficient SOL balance for mainnet transaction (need at least 0.05 SOL)';
      }
      if (message.includes('timeout') || message.includes('connection') || message.includes('fetch')) {
        return 'Mainnet network connection issues detected - RPC endpoints may be down or congested';
      }
      if (message.includes('blockhash')) {
        return 'Mainnet blockhash expired - transaction took too long, please retry';
      }
      if (message.includes('429') || message.includes('rate limit')) {
        return 'Mainnet RPC rate limit reached - please wait and try again';
      }
      if (message.includes('network') || message.includes('rpc')) {
        return 'Network connectivity issues detected - please check your internet connection and try again';
      }
    }
    
    return createUserFriendlyError(error, 'transaction');
  }

  async createTokenWithRetry(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    let lastError: any;
    
    console.log(`Starting token creation on ${this.network} with ${EnhancedSolanaService.MAX_RETRIES} max attempts`);
    
    for (let attempt = 0; attempt < EnhancedSolanaService.MAX_RETRIES; attempt++) {
      try {
        console.log(`Token creation attempt ${attempt + 1}/${EnhancedSolanaService.MAX_RETRIES} using ${this.getCurrentEndpointName()}`);
        
        if (metadata.imageBlob) {
          return await this.createTokenWithMetadata(wallet, metadata);
        } else {
          return await this.createToken(wallet, metadata);
        }
        
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed on ${this.getCurrentEndpointName()}:`, error);
        lastError = error;
        
        // Don't retry on certain errors
        const errorMessage = error?.message?.toLowerCase() || '';
        if (errorMessage.includes('user rejected') || 
            errorMessage.includes('insufficient funds') ||
            errorMessage.includes('invalid')) {
          console.log('Non-retryable error detected, stopping attempts');
          break;
        }
        
        // Switch RPC endpoint for next attempt
        if (attempt < EnhancedSolanaService.MAX_RETRIES - 1) {
          const switched = await this.switchToNextConnection();
          if (switched) {
            console.log(`Switched to ${this.getCurrentEndpointName()}, retrying...`);
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.log('No more RPC endpoints available');
            break;
          }
        }
      }
    }
    
    const finalError = this.createNetworkSpecificError(lastError);
    throw new Error(finalError);
  }

  private async createToken(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    const connection = this.getCurrentConnection();
    const walletPublicKey = typeof wallet.publicKey === 'string' 
      ? new PublicKey(wallet.publicKey) 
      : wallet.publicKey;
    const feeRecipient = SecurityConfig.getFeeRecipient();

    console.log(`Creating token on ${this.network} using ${this.getCurrentEndpointName()}`);
    
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
    
    console.log(`Mint creation transaction sent: ${createSignature}`);
    
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
    
    console.log(`Token minting transaction sent: ${mintSignature}`);
    
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

    console.log(`Token creation completed successfully on ${this.network}!`);

    return {
      mintAddress: mintKeypair.publicKey.toBase58(),
      tokenAccountAddress: associatedTokenAddress.toBase58(),
      transactionSignature: mintSignature,
      explorerUrl: this.getExplorerUrl(mintKeypair.publicKey.toBase58())
    };
  }

  private async createTokenWithMetadata(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
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
