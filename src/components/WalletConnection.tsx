
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
    // Check for existing connection more carefully
    checkExistingConnection();
  }, []);

  const checkWalletInstallation = () => {
    const { solana } = window as any;
    const isInstalled = solana && solana.isPhantom;
    setWalletInstalled(isInstalled);
    
    if (!isInstalled) {
      console.log('Phantom wallet not detected');
    }
  };

  const checkExistingConnection = async () => {
    try {
      const { solana } = window as any;
      if (solana && solana.isPhantom) {
        // Only check if already connected, don't auto-connect
        if (solana.isConnected && solana.publicKey) {
          const walletInfo = {
            publicKey: solana.publicKey.toString(),
            connected: true,
            adapter: solana,
            type: 'Phantom'
          };
          setWallet(walletInfo);
          onWalletChange(walletInfo);
        }
      }
    } catch (error) {
      console.log('No existing connection found');
    }
  };

  const connectWallet = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    
    try {
      const { solana } = window as any;
      
      if (!solana || !solana.isPhantom) {
        toast({
          title: "Phantom Wallet Required",
          description: "Please install Phantom wallet to continue",
          variant: "destructive"
        });
        window.open('https://phantom.app/', '_blank');
        return;
      }

      console.log('Initiating wallet connection...');
      
      // Use the standard Phantom connection method
      const response = await solana.connect();
      
      if (response && response.publicKey) {
        const walletInfo = {
          publicKey: response.publicKey.toString(),
          connected: true,
          adapter: solana,
          type: 'Phantom'
        };
        
        setWallet(walletInfo);
        onWalletChange(walletInfo);
        
        toast({
          title: "Wallet Connected! 🎉",
          description: "Phantom wallet connected successfully",
        });
      } else {
        throw new Error('No public key received');
      }

    } catch (error: any) {
      console.error('Wallet connection error:', error);
      
      let errorMessage = "Failed to connect wallet";
      
      if (error.message?.includes('User rejected')) {
        errorMessage = "Connection was cancelled";
      } else if (error.code === 4001) {
        errorMessage = "Connection rejected by user";
      } else if (error.message?.includes('pending')) {
        errorMessage = "Please check your Phantom wallet for pending connection request";
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
      
      toast({
        title: "Wallet Disconnected",
        description: "Phantom wallet has been disconnected",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      // Force local disconnect even if wallet fails
      setWallet(null);
      onWalletChange(null);
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

  return (
    <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          
          <div>
            <h3 className="text-white font-semibold">
              {wallet ? 'Phantom Wallet' : 'Wallet Status'}
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
                  {walletInstalled ? 'Not Connected' : 'Phantom Not Found'}
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
              {isConnecting ? 'Connecting...' : 'Connect Phantom'}
            </Button>
          ) : (
            <Button
              onClick={() => window.open('https://phantom.app/', '_blank')}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Install Phantom
            </Button>
          )}
        </div>
      </div>
      
      {!walletInstalled && (
        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <p className="text-orange-200 text-sm">
            Please install Phantom wallet to create Solana tokens safely.
          </p>
        </div>
      )}
    </Card>
  );
};

export default WalletConnection;
