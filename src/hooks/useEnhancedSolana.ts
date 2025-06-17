import { useState, useEffect } from 'react';
import { EnhancedSolanaService } from '../services/enhancedSolanaService';
import { TokenMetadata } from '../services/solanaService';
import { Keypair } from '@solana/web3.js';

export const useEnhancedSolana = (network: 'mainnet' | 'devnet' = 'devnet') => {
  const [service, setService] = useState<EnhancedSolanaService>(
    new EnhancedSolanaService(network)
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const newService = new EnhancedSolanaService(network);
    setService(newService);
    checkConnection(newService);
  }, [network]);

  const checkConnection = async (solanaService: EnhancedSolanaService) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Attempting to connect to ${network}...`);
      const connected = await solanaService.checkConnection();
      setIsConnected(connected);
      
      if (!connected) {
        const errorMsg = `Failed to connect to ${network} - all RPC endpoints unavailable. This may be due to network congestion or temporary RPC issues.`;
        setError(errorMsg);
        console.error(errorMsg);
      } else {
        console.log(`Successfully connected to ${network}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      const fullError = `${network} connection failed: ${errorMessage}`;
      setError(fullError);
      setIsConnected(false);
      console.error(fullError);
    } finally {
      setIsLoading(false);
    }
  };

  const createToken = async (metadata: TokenMetadata, wallet?: any) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!wallet || !wallet.publicKey || !wallet.adapter) {
        throw new Error('Wallet not properly connected');
      }

      // Enhanced validation for mainnet
      if (network === 'mainnet') {
        console.log('Creating token on Mainnet with enhanced validation...');
        
        // Pre-flight test
        const testResult = await service.testTransactionReadiness(wallet, metadata);
        if (!testResult.success) {
          throw new Error(`Pre-flight check failed: ${testResult.errors?.join(', ')}`);
        }
      }

      // Use retry mechanism for token creation
      const result = await service.createTokenWithRetry(wallet, metadata);
      
      console.log(`Token created successfully on ${network}:`, result);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Token creation failed';
      console.error(`${network} token creation failed:`, err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const testTransaction = async (metadata: TokenMetadata, wallet?: any) => {
    if (!wallet) {
      throw new Error('Wallet required for transaction testing');
    }

    try {
      const result = await service.testTransactionReadiness(wallet, metadata);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction test failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const switchNetwork = (newNetwork: 'mainnet' | 'devnet') => {
    const newService = new EnhancedSolanaService(newNetwork);
    setService(newService);
    checkConnection(newService);
  };

  return {
    service,
    isConnected,
    isLoading,
    error,
    network,
    createToken,
    testTransaction,
    switchNetwork,
    checkConnection: () => checkConnection(service),
    getTokenCreationFee: () => EnhancedSolanaService.getTokenCreationFee()
  };
};
