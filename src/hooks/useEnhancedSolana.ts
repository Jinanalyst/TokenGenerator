import { useState, useEffect, useMemo } from 'react';
import { EnhancedSolanaService } from '../services/enhancedSolanaService';
import { TokenMetadata } from '../services/solanaService';
import { Keypair } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

export const useEnhancedSolana = () => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const service = useMemo(() => {
    if (!connection) return null;
    
    return new EnhancedSolanaService(
      connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet', 
      connection
    );
  }, [connection]);

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wallet.connected && service) {
      checkConnection(service);
    } else {
      setIsConnected(false);
    }
  }, [wallet.connected, service]);

  const checkConnection = async (solanaService: EnhancedSolanaService) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const network = solanaService.network;
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
      const fullError = `Connection failed: ${errorMessage}`;
      setError(fullError);
      setIsConnected(false);
      console.error(fullError);
    } finally {
      setIsLoading(false);
    }
  };

  const createToken = async (metadata: TokenMetadata) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!wallet || !wallet.publicKey) {
        throw new Error('Wallet not properly connected');
      }

      console.log(`Creating token on ${service.network}...`);
      
      const result = await service.createTokenWithRetry(wallet, metadata);
      
      console.log(`Token created successfully on ${service.network}:`, result);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Token creation failed';
      console.error(`${service.network} token creation failed:`, err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const testTransaction = async (metadata: TokenMetadata) => {
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

  return {
    service,
    isConnected,
    isLoading,
    error,
    network: service?.network ?? 'devnet',
    createToken,
    testTransaction,
    checkConnection: () => checkConnection(service),
    getTokenCreationFee: () => EnhancedSolanaService.getTokenCreationFee()
  };
};
