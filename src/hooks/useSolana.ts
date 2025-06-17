
import { useState, useEffect } from 'react';
import { SolanaService, mainnetService, devnetService, TokenMetadata } from '../services/solanaService';
import { Keypair } from '@solana/web3.js';

export const useSolana = (network: 'mainnet' | 'devnet' = 'devnet') => {
  const [service, setService] = useState<SolanaService>(
    network === 'mainnet' ? mainnetService : devnetService
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const newService = network === 'mainnet' ? mainnetService : devnetService;
    setService(newService);
    checkConnection(newService);
  }, [network]);

  const checkConnection = async (solanaService: SolanaService) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const connected = await solanaService.checkConnection();
      setIsConnected(connected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const createToken = async (metadata: TokenMetadata, wallet?: any) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!wallet || !wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      // For real token creation, we need the wallet to sign
      // This is a simplified version - in a real app, you'd use the wallet adapter
      const result = await service.createToken(wallet, metadata);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Token creation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const switchNetwork = (newNetwork: 'mainnet' | 'devnet') => {
    const newService = newNetwork === 'mainnet' ? mainnetService : devnetService;
    setService(newService);
    checkConnection(newService);
  };

  return {
    service,
    isConnected,
    isLoading,
    error,
    createToken,
    switchNetwork,
    checkConnection: () => checkConnection(service),
    getTokenCreationFee: () => SolanaService.getTokenCreationFee()
  };
};
