
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, ChevronDown, CheckCircle, Copy, ExternalLink, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WalletOption {
  name: string;
  icon: string;
  adapter: string;
  url: string;
}

const SUPPORTED_WALLETS: WalletOption[] = [
  {
    name: 'Phantom',
    icon: '👻',
    adapter: 'phantom',
    url: 'https://phantom.app/'
  },
  {
    name: 'Solflare',
    icon: '🔥',
    adapter: 'solflare',
    url: 'https://solflare.com/'
  },
  {
    name: 'Backpack',
    icon: '🎒',
    adapter: 'backpack',
    url: 'https://www.backpack.app/'
  }
];

interface WalletSelectorProps {
  onWalletChange: (wallet: any) => void;
}

const WalletSelector: React.FC<WalletSelectorProps> = ({ onWalletChange }) => {
  const [selectedWallet, setSelectedWallet] = useState<string>('phantom');
  const [wallet, setWallet] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletOption[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    checkAvailableWallets();
    checkExistingConnection();
  }, []);

  const checkAvailableWallets = () => {
    const available: WalletOption[] = [];

    if (typeof window !== 'undefined') {
      if (window.phantom?.solana?.isPhantom) {
        available.push(SUPPORTED_WALLETS[0]);
      }
      
      if (window.solflare?.isSolflare) {
        available.push(SUPPORTED_WALLETS[1]);
      }
      
      if (window.backpack?.isBackpack) {
        available.push(SUPPORTED_WALLETS[2]);
      }
    }

    setAvailableWallets(available);
  };

  const checkExistingConnection = async () => {
    try {
      const { solana } = window as any;
      if (solana && solana.isPhantom && solana.isConnected && solana.publicKey) {
        const walletInfo = createStandardWalletObject(solana, 'phantom');
        setWallet(walletInfo);
        onWalletChange(walletInfo);
      }
    } catch (error) {
      console.log('No existing connection found');
    }
  };

  const getWalletProvider = () => {
    if (selectedWallet === 'phantom') {
      return window.phantom?.solana;
    } else if (selectedWallet === 'solflare') {
      return window.solflare;
    } else if (selectedWallet === 'backpack') {
      return window.backpack;
    }
    return null;
  };

  // Create standardized wallet object that follows common patterns
  const createStandardWalletObject = (provider: any, walletType: string) => {
    return {
      publicKey: provider.publicKey,
      connected: true,
      adapter: {
        name: walletType,
        url: SUPPORTED_WALLETS.find(w => w.adapter === walletType)?.url || '',
        icon: SUPPORTED_WALLETS.find(w => w.adapter === walletType)?.icon || '',
        publicKey: provider.publicKey,
        connected: true,
        signTransaction: provider.signTransaction?.bind(provider),
        signAllTransactions: provider.signAllTransactions?.bind(provider),
        connect: provider.connect?.bind(provider),
        disconnect: provider.disconnect?.bind(provider)
      },
      // Direct methods for backward compatibility
      signTransaction: provider.signTransaction?.bind(provider),
      signAllTransactions: provider.signAllTransactions?.bind(provider),
      connect: provider.connect?.bind(provider),
      disconnect: provider.disconnect?.bind(provider),
      type: walletType
    };
  };

  const connectWallet = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    
    try {
      const provider = getWalletProvider();
      
      if (!provider) {
        toast({
          title: "Wallet Not Found",
          description: `Please install ${selectedWallet} wallet to continue`,
          variant: "destructive"
        });
        return;
      }

      console.log(`Connecting to ${selectedWallet} wallet...`);
      
      // Use standard connection method with minimal configuration
      const response = await provider.connect({ onlyIfTrusted: false });
      
      if (response?.publicKey) {
        const walletInfo = createStandardWalletObject(provider, selectedWallet);
        
        setWallet(walletInfo);
        onWalletChange(walletInfo);
        
        toast({
          title: "Wallet Connected! 🎉",
          description: `${selectedWallet} wallet connected successfully`,
        });
      }

    } catch (error: any) {
      console.error('Wallet connection error:', error);
      
      let errorMessage = "Failed to connect wallet";
      
      if (error.code === 4001 || error.message?.includes('rejected')) {
        errorMessage = "Connection was rejected by user";
      } else if (error.code === -32002) {
        errorMessage = "Please check your wallet for pending connection request";
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
      const provider = getWalletProvider();
      if (provider?.disconnect) {
        await provider.disconnect();
      }
      setWallet(null);
      onWalletChange(null);
      
      toast({
        title: "Wallet Disconnected",
        description: "Wallet has been disconnected",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      setWallet(null);
      onWalletChange(null);
    }
  };

  const copyAddress = () => {
    if (wallet?.publicKey) {
      const address = typeof wallet.publicKey === 'string' ? wallet.publicKey : wallet.publicKey.toString();
      navigator.clipboard.writeText(address);
      toast({
        title: "Address Copied!",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const openWalletInstall = (walletUrl: string) => {
    window.open(walletUrl, '_blank');
  };

  const selectedWalletInfo = SUPPORTED_WALLETS.find(w => w.adapter === selectedWallet);

  return (
    <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-4">
      <div className="space-y-4">
        {/* Security Notice */}
        <div className="flex items-start space-x-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-200">
            <p className="font-medium">Secure Token Creation</p>
            <p>This app creates tokens using standard Solana protocols. No private keys are stored or transmitted.</p>
          </div>
        </div>

        {/* Wallet Selection */}
        {!wallet && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Choose Wallet</h3>
                <p className="text-purple-200 text-sm">Select your preferred Solana wallet</p>
              </div>
            </div>

            <Select value={selectedWallet} onValueChange={setSelectedWallet}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    <span>{selectedWalletInfo?.icon}</span>
                    <span>{selectedWalletInfo?.name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {SUPPORTED_WALLETS.map((walletOption) => (
                  <SelectItem 
                    key={walletOption.adapter} 
                    value={walletOption.adapter}
                    className="text-white hover:bg-gray-800"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{walletOption.icon}</span>
                      <span>{walletOption.name}</span>
                      {availableWallets.some(w => w.adapter === walletOption.adapter) && (
                        <CheckCircle className="w-3 h-3 text-green-400 ml-auto" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex items-center justify-between">
          {wallet ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{selectedWalletInfo?.icon}</span>
                <div>
                  <h3 className="text-white font-semibold">{selectedWalletInfo?.name}</h3>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 text-sm">Connected</span>
                  </div>
                </div>
              </div>
              
              <Badge 
                className="bg-green-500/20 text-green-300 cursor-pointer hover:bg-green-500/30"
                onClick={copyAddress}
              >
                <Copy className="w-3 h-3 mr-1" />
                {(() => {
                  const address = typeof wallet.publicKey === 'string' ? wallet.publicKey : wallet.publicKey.toString();
                  return `${address.slice(0, 4)}...${address.slice(-4)}`;
                })()}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-lg">{selectedWalletInfo?.icon}</span>
              <span className="text-orange-400 text-sm">Not Connected</span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {wallet ? (
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectWallet}
                className="text-white border-white/20 hover:bg-white/10"
              >
                Disconnect
              </Button>
            ) : availableWallets.some(w => w.adapter === selectedWallet) ? (
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {isConnecting ? 'Connecting...' : `Connect ${selectedWalletInfo?.name}`}
              </Button>
            ) : (
              <Button
                onClick={() => openWalletInstall(selectedWalletInfo?.url || '')}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Install {selectedWalletInfo?.name}
              </Button>
            )}
          </div>
        </div>

        {/* Available Wallets Info */}
        {availableWallets.length === 0 && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-orange-200 text-sm">
              No Solana wallets detected. Please install a wallet to create tokens safely.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default WalletSelector;
