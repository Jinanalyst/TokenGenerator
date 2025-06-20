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

  constructor(network: 'mainnet' | 'devnet', wallet?: any) {
    this.network = network;
    this.initializeConnection();
    this.metaplexService = new MetaplexService(this.connection, wallet);
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

  setWallet(wallet: any) {
    this.metaplexService.setWallet(wallet);
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
      console.error('Transaction readiness test failed:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        estimatedFee: 0,
        balanceCheck: false,
        connectionStatus: false
      };
    }
  }

  async createTokenWithRetry(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    console.log(`Creating token with retry on ${this.network}...`);
    
    // Use the metadata-enabled version
    return await this.createTokenWithMetadata(wallet, metadata);
  }

  // Simplified, Phantom-friendly token creation
  private async createToken(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    // Get wallet public key
    const walletPublicKey = wallet.publicKey || wallet.adapter?.publicKey;
    const publicKey = typeof walletPublicKey === 'string' 
      ? new PublicKey(walletPublicKey) 
      : walletPublicKey;
    
    console.log(`Creating token on ${this.network} with simplified approach`);
    
    // Create mint keypair
    const mintKeypair = Keypair.generate();
    
    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    
    // Create a single, simplified transaction
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    // Get mint rent
    const mintRent = await this.connection.getMinimumBalanceForRentExemption(82);

    // Add create account instruction
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: 82,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // Add initialize mint instruction
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        metadata.decimals,
        publicKey,
        publicKey
      )
    );

    // Get associated token address
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      publicKey
    );

    // Add create associated token account instruction
    transaction.add(
      createAssociatedTokenAccountInstruction(
        publicKey,
        associatedTokenAddress,
        publicKey,
        mintKeypair.publicKey
      )
    );

    // Add mint to instruction
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAddress,
        publicKey,
        metadata.supply * Math.pow(10, metadata.decimals)
      )
    );

    // Add authority revocation instructions if requested
    if (metadata.revokeMintAuthority) {
      transaction.add(
        createSetAuthorityInstruction(
          mintKeypair.publicKey,
          publicKey,
          AuthorityType.MintTokens,
          null
        )
      );
    }

    if (metadata.revokeFreezeAuthority) {
      transaction.add(
        createSetAuthorityInstruction(
          mintKeypair.publicKey,
          publicKey,
          AuthorityType.FreezeAccount,
          null
        )
      );
    }

    // Sign the transaction with the mint keypair
    transaction.partialSign(mintKeypair);

    // Simulate transaction first to catch errors
    try {
      console.log('Simulating transaction...');
      const simulation = await this.connection.simulateTransaction(transaction);
      
      if (simulation.value.err) {
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }
      
      console.log('Transaction simulation successful');
    } catch (error) {
      console.error('Transaction simulation failed:', error);
      throw new Error(`Transaction simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Sign and send transaction
    console.log('Requesting wallet signature...');
    const signTransaction = wallet.signTransaction || wallet.adapter?.signTransaction;
    if (!signTransaction) {
      throw new Error('Wallet signing method not available');
    }
    
    try {
      const signedTransaction = await signTransaction(transaction);
      
      console.log('Sending transaction...');
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        { 
          skipPreflight: false, 
          preflightCommitment: 'confirmed',
          maxRetries: 3
        }
      );
      
      console.log(`Transaction sent: ${signature}`);
      
      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log(`Token created successfully on ${this.network}!`);

      return {
        mintAddress: mintKeypair.publicKey.toBase58(),
        tokenAccountAddress: associatedTokenAddress.toBase58(),
        transactionSignature: signature,
        explorerUrl: this.getExplorerUrl(mintKeypair.publicKey.toBase58())
      };
    } catch (error) {
      console.error('Transaction failed:', error);
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create token with proper metadata
  private async createTokenWithMetadata(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    console.log('Creating token with metadata...');
    
    // First create the token
    const result = await this.createToken(wallet, metadata);
    
    // Then add metadata if image is provided
    if (metadata.imageBlob) {
      try {
        console.log('Adding metadata to token...');
        this.metaplexService.setWallet(wallet); // Ensure wallet is set in Metaplex service
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
        
        // Send the metadata transaction
        console.log('Sending metadata transaction...');
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
        metadataResult.transaction.recentBlockhash = blockhash;
        metadataResult.transaction.feePayer = publicKey;
        
        // Sign and send metadata transaction
        const signTransaction = wallet.signTransaction || wallet.adapter?.signTransaction;
        if (!signTransaction) {
          throw new Error('Wallet signing method not available for metadata transaction');
        }

        const signedMetadataTransaction = await signTransaction(metadataResult.transaction);
        const metadataSignature = await this.connection.sendRawTransaction(
          signedMetadataTransaction.serialize(),
          { 
            skipPreflight: true, // Skip preflight to avoid simulation errors with new metadata accounts
            preflightCommitment: 'confirmed',
            maxRetries: 3
          }
        );
        
        console.log(`Metadata transaction sent: ${metadataSignature}`);
        
        // Confirm metadata transaction
        const confirmation = await this.connection.confirmTransaction({
          signature: metadataSignature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');

        if (confirmation.value.err) {
          console.error('Metadata transaction confirmation failed:', confirmation.value.err);
          throw new Error(`Metadata transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        console.log('Metadata transaction confirmed successfully');
        
        result.metadataUri = metadataResult.metadataUri;
        console.log('Metadata added successfully:', metadataResult.metadataUri);
      } catch (error) {
        console.error('Metadata upload failed, but token was created:', error);
        // Do not re-throw error, allow token creation to be reported as success
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
