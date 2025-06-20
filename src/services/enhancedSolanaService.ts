
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
  private static readonly TOKEN_CREATION_FEE = 0.001 * LAMPORTS_PER_SOL;
  private static readonly MAINNET_MIN_BALANCE = 0.02 * LAMPORTS_PER_SOL;
  private static readonly CONFIRMATION_TIMEOUT = 60000;

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

  private validateWallet(wallet: any): { isValid: boolean; error?: string } {
    if (!wallet) {
      return { isValid: false, error: 'No wallet provided' };
    }

    const publicKey = wallet.publicKey || wallet.adapter?.publicKey;
    if (!publicKey) {
      return { isValid: false, error: 'Wallet public key not found' };
    }

    const isConnected = wallet.connected !== false;
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

      const walletValidation = this.validateWallet(wallet);
      if (!walletValidation.isValid) {
        errors.push(`Wallet: ${walletValidation.error}`);
        return { 
          success: false, 
          errors, 
          connectionStatus
        };
      }

      const walletPublicKey = wallet.publicKey || wallet.adapter?.publicKey;
      const publicKey = typeof walletPublicKey === 'string' 
        ? new PublicKey(walletPublicKey) 
        : walletPublicKey;

      const balance = await this.getBalance(publicKey);
      const requiredBalance = this.getMinimumBalance() / LAMPORTS_PER_SOL;
      const balanceCheck = balance >= requiredBalance;
      
      if (!balanceCheck) {
        errors.push(`Insufficient balance. Need ${requiredBalance.toFixed(4)} SOL, have ${balance.toFixed(4)} SOL`);
      }

      estimatedFee = (EnhancedSolanaService.TOKEN_CREATION_FEE + 0.005 * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL;

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
    console.log(`Creating token with metadata on ${this.network}...`);
    
    // Create the token first
    const tokenResult = await this.createToken(wallet, metadata);
    
    // Then add metadata if image is provided
    if (metadata.imageBlob && tokenResult) {
      console.log('Adding metadata to token...');
      const metadataResult = await this.addMetadataToToken(
        wallet,
        tokenResult.mintAddress,
        metadata
      );
      
      if (metadataResult.success) {
        tokenResult.metadataUri = metadataResult.metadataUri;
        console.log('✅ Token created with metadata successfully');
      } else {
        console.warn('⚠️ Token created but metadata failed:', metadataResult.error);
        // Don't fail the entire operation if only metadata fails
      }
    }
    
    return tokenResult;
  }

  private async createToken(wallet: any, metadata: TokenMetadata): Promise<TokenCreationResult> {
    const walletPublicKey = wallet.publicKey || wallet.adapter?.publicKey;
    const publicKey = typeof walletPublicKey === 'string' 
      ? new PublicKey(walletPublicKey) 
      : walletPublicKey;
    
    console.log(`Creating token on ${this.network}...`);
    
    const mintKeypair = Keypair.generate();
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    const mintRent = await this.connection.getMinimumBalanceForRentExemption(82);

    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: 82,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        metadata.decimals,
        publicKey,
        publicKey
      )
    );

    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      publicKey
    );

    transaction.add(
      createAssociatedTokenAccountInstruction(
        publicKey,
        associatedTokenAddress,
        publicKey,
        mintKeypair.publicKey
      )
    );

    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAddress,
        publicKey,
        metadata.supply * Math.pow(10, metadata.decimals)
      )
    );

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

    transaction.partialSign(mintKeypair);

    try {
      console.log('Simulating transaction...');
      const simulation = await this.connection.simulateTransaction(transaction);
      
      if (simulation.value.err) {
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }
      
      console.log('Requesting wallet signature...');
      const signTransaction = wallet.signTransaction || wallet.adapter?.signTransaction;
      if (!signTransaction) {
        throw new Error('Wallet signing method not available');
      }
      
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
      
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log(`✅ Token created successfully on ${this.network}!`);

      return {
        mintAddress: mintKeypair.publicKey.toBase58(),
        tokenAccountAddress: associatedTokenAddress.toBase58(),
        transactionSignature: signature,
        explorerUrl: this.getExplorerUrl(mintKeypair.publicKey.toBase58())
      };
    } catch (error) {
      console.error('Token creation transaction failed:', error);
      throw new Error(`Token creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async addMetadataToToken(
    wallet: any,
    mintAddress: string,
    metadata: TokenMetadata
  ): Promise<{ success: boolean; metadataUri?: string; error?: string }> {
    try {
      console.log('Starting metadata addition process...');
      
      if (!metadata.imageBlob) {
        return { success: false, error: 'No image provided for metadata' };
      }

      // Upload image and metadata to IPFS
      const metadataResult = await this.metaplexService.uploadAndCreateMetadata(
        metadata.name,
        metadata.symbol,
        metadata.description || `${metadata.name} - Created with Solana Token Generator AI`,
        metadata.imageBlob,
        new PublicKey(mintAddress),
        wallet.publicKey || wallet.adapter?.publicKey
      );

      if (!metadataResult.success) {
        return { 
          success: false, 
          error: metadataResult.error || 'Failed to upload metadata to IPFS' 
        };
      }

      console.log('Metadata uploaded to IPFS:', metadataResult.metadataUri);

      // Create metadata account transaction
      const metadataAccountResult = await this.metaplexService.createMetadataAccount(
        new PublicKey(mintAddress),
        metadataResult.metadataUri,
        metadata.name,
        metadata.symbol,
        wallet.publicKey || wallet.adapter?.publicKey
      );

      if (!metadataAccountResult.success) {
        return {
          success: false,
          error: metadataAccountResult.error || 'Failed to create metadata account'
        };
      }

      // Send metadata transaction
      try {
        console.log('Sending metadata transaction...');
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
        metadataAccountResult.transaction.recentBlockhash = blockhash;
        metadataAccountResult.transaction.feePayer = wallet.publicKey || wallet.adapter?.publicKey;

        const signTransaction = wallet.signTransaction || wallet.adapter?.signTransaction;
        if (!signTransaction) {
          throw new Error('Wallet signing method not available for metadata');
        }

        const signedMetadataTransaction = await signTransaction(metadataAccountResult.transaction);
        const metadataSignature = await this.connection.sendRawTransaction(
          signedMetadataTransaction.serialize(),
          { 
            skipPreflight: true, // Skip preflight for metadata accounts
            preflightCommitment: 'confirmed',
            maxRetries: 2
          }
        );
        
        console.log(`Metadata transaction sent: ${metadataSignature}`);
        
        // Don't wait for confirmation to avoid blocking
        // The metadata will appear once confirmed
        this.connection.confirmTransaction({
          signature: metadataSignature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed').then((confirmation) => {
          if (confirmation.value.err) {
            console.error('Metadata transaction confirmation failed:', confirmation.value.err);
          } else {
            console.log('✅ Metadata transaction confirmed successfully');
          }
        }).catch((error) => {
          console.error('Metadata confirmation error:', error);
        });

        return {
          success: true,
          metadataUri: metadataResult.metadataUri
        };
      } catch (metadataError) {
        console.error('Metadata transaction failed:', metadataError);
        return {
          success: false,
          error: `Metadata transaction failed: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}`
        };
      }
    } catch (error) {
      console.error('Metadata addition failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown metadata error'
      };
    }
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
