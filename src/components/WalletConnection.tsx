
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WalletConnectionProps {
  onWalletChange: (wallet: any) => void;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({ onWalletChange }) => {
  const [wallet, setWallet] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      const { solana } = window as any;
      if (solana && solana.isPhantom) {
        const response = await solana.connect({ onlyIfTrusted: true });
        if (response.publicKey) {
          const walletInfo = {
            publicKey: response.publicKey.toString(),
            connected: true,
            adapter: solana
          };
          setWallet(walletInfo);
          onWalletChange(walletInfo);
        }
      }
    } catch (error) {
      console.log('Wallet not auto-connected');
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const { solana } = window as any;
      
      if (!solana || !solana.isPhantom) {
        toast({
          title: "Phantom Wallet Required",
          description: "Please install Phantom wallet to create tokens",
          variant: "destructive"
        });
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const response = await solana.connect();
      const walletInfo = {
        publicKey: response.publicKey.toString(),
        connected: true,
        adapter: solana
      };
      
      setWallet(walletInfo);
      onWalletChange(walletInfo);
      
      toast({
        title: "Wallet Connected! 🎉",
        description: "You can now create real Solana tokens",
      });
    } catch (error) {
      console.error('Wallet connection failed:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (wallet?.adapter) {
        await wallet.adapter.disconnect();
      }
      setWallet(null);
      onWalletChange(null);
      
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
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
            <h3 className="text-white font-semibold">Wallet Status</h3>
            {wallet ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-green-400 text-sm">Connected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-3 h-3 text-orange-400" />
                <span className="text-orange-400 text-sm">Not Connected</span>
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
          ) : (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default WalletConnection;
