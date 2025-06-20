import { useState, useEffect } from 'react';
import { EnhancedSolanaService } from '../services/enhancedSolanaService';
import { TokenMetadata } from '../services/solanaService';
import { Keypair } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

export const useEnhancedSolana = (network: 'mainnet' | 'devnet' = 'devnet') => {
  const wallet = useWallet();
  const [service, setService] = useState<EnhancedSolanaService>(
    new EnhancedSolanaService(network, wallet)
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const newService = new EnhancedSolanaService(network, wallet);
    setService(newService);
    if (wallet.connected) {
      newService.setWallet(wallet);
      checkConnection(newService);
    } else {
      setIsConnected(false);
    }
  }, [network, wallet, wallet.connected]);

  const checkConnection = async (solanaService: EnhancedSolanaService) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Connecting to ${network}...`);
      const connected = await solanaService.checkConnection();
      setIsConnected(connected);
      
      if (!connected) {
        const errorMsg = `Failed to connect to ${network}. Please check your internet connection.`;
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
      if (!wallet || !wallet.publicKey) {
        throw new Error('Wallet not properly connected');
      }

      console.log(`Creating token on ${network}...`);
      
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
