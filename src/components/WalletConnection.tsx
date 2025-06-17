
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, AlertCircle, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WalletConnectionProps {
  onWalletChange: (wallet: any) => void;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ onWalletChange }) => {
  const [wallet, setWallet] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletInstalled, setWalletInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkWalletInstallation();
    // Only auto-connect if we previously had a connection
    const wasConnected = localStorage.getItem('wallet-connected');
    if (wasConnected === 'true') {
      setTimeout(() => checkWalletConnection(), 1000);
    }
  }, []);

  const checkWalletInstallation = () => {
    const { solana } = window as any;
    const isInstalled = solana && (solana.isPhantom || solana.isSolflare || solana.isBackpack);
    setWalletInstalled(isInstalled);
    
    if (!isInstalled) {
      console.log('No Solana wallet detected');
    }
  };

  const checkWalletConnection = async () => {
    try {
      const { solana } = window as any;
      if (solana && (solana.isPhantom || solana.isSolflare || solana.isBackpack)) {
        // Only try silent connection, don't force it
        const response = await solana.connect({ onlyIfTrusted: true });
        if (response.publicKey) {
          const walletInfo = {
            publicKey: response.publicKey.toString(),
            connected: true,
            adapter: solana,
            type: solana.isPhantom ? 'Phantom' : solana.isSolflare ? 'Solflare' : 'Backpack'
          };
          setWallet(walletInfo);
          onWalletChange(walletInfo);
          localStorage.setItem('wallet-connected', 'true');
        }
      }
    } catch (error) {
      console.log('Auto-connect failed (this is normal):', error);
      localStorage.removeItem('wallet-connected');
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const { solana } = window as any;
      
      if (!solana) {
        toast({
          title: "No Wallet Found",
          description: "Please install a Solana wallet like Phantom, Solflare, or Backpack",
          variant: "destructive"
        });
        window.open('https://phantom.app/', '_blank');
        return;
      }

      // Check if wallet is locked
      if (!solana.isConnected && solana.publicKey) {
        toast({
          title: "Wallet Locked",
          description: "Please unlock your wallet and try again",
          variant: "destructive"
        });
        return;
      }

      // Clear any existing connection state
      if (solana.isConnected) {
        await solana.disconnect();
      }

      // Request connection with explicit user interaction
      console.log('Requesting wallet connection...');
      const response = await solana.connect();
      
      if (!response.publicKey) {
        throw new Error('Connection failed - no public key received');
      }

      const walletInfo = {
        publicKey: response.publicKey.toString(),
        connected: true,
        adapter: solana,
        type: solana.isPhantom ? 'Phantom' : solana.isSolflare ? 'Solflare' : 'Backpack'
      };
      
      setWallet(walletInfo);
      onWalletChange(walletInfo);
      localStorage.setItem('wallet-connected', 'true');
      
      toast({
        title: `${walletInfo.type} Connected! 🎉`,
        description: "You can now create real Solana tokens",
      });

    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      
      let errorMessage = "Failed to connect wallet. Please try again.";
      
      if (error.message?.includes('User rejected')) {
        errorMessage = "Connection cancelled by user";
      } else if (error.code === 4001) {
        errorMessage = "Connection rejected by wallet";
      } else if (error.message?.includes('already pending')) {
        errorMessage = "Connection already in progress. Please check your wallet.";
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (wallet?.adapter && wallet.adapter.disconnect) {
        await wallet.adapter.disconnect();
      }
      setWallet(null);
      onWalletChange(null);
      localStorage.removeItem('wallet-connected');
      
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
      // Force disconnect locally even if wallet fails
      setWallet(null);
      onWalletChange(null);
      localStorage.removeItem('wallet-connected');
    }
  };

  const copyAddress = () => {
    if (wallet?.publicKey) {
      navigator.clipboard.writeText(wallet.publicKey);
      toast({
        title: "Address Copied!",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const openWalletSite = () => {
    window.open('https://phantom.app/', '_blank');
  };

  return (
    <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          
          <div>
            <h3 className="text-white font-semibold">
              {wallet ? `${wallet.type} Wallet` : 'Wallet Status'}
            </h3>
            {wallet ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-green-400 text-sm">Connected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-3 h-3 text-orange-400" />
                <span className="text-orange-400 text-sm">
                  {walletInstalled ? 'Not Connected' : 'No Wallet Found'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {wallet ? (
            <>
              <Badge 
                className="bg-green-500/20 text-green-300 cursor-pointer hover:bg-green-500/30"
                onClick={copyAddress}
              >
                <Copy className="w-3 h-3 mr-1" />
                {wallet.publicKey.slice(0, 4)}...{wallet.publicKey.slice(-4)}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectWallet}
                className="text-white border-white/20 hover:bg-white/10"
              >
                Disconnect
              </Button>
            </>
          ) : walletInstalled ? (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          ) : (
            <Button
              onClick={openWalletSite}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Install Wallet
            </Button>
          )}
        </div>
      </div>
      
      {!walletInstalled && (
        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <p className="text-orange-200 text-sm">
            To create tokens, please install a Solana wallet like Phantom, Solflare, or Backpack first.
          </p>
        </div>
      )}
    </Card>
  );
};

export default WalletConnection;
