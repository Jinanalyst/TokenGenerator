
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Coins, 
  Globe, 
  Hash, 
  Users, 
  Zap, 
  CheckCircle,
  AlertCircle,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TokenCreationPanelProps {
  tokenData: {
    name?: string;
    symbol?: string;
    supply?: number;
    decimals?: number;
    network?: string;
  };
}

const TokenCreationPanel: React.FC<TokenCreationPanelProps> = ({ tokenData }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [tokenAddress, setTokenAddress] = useState('');
  const { toast } = useToast();

  const handleCreateToken = async () => {
    setIsCreating(true);
    
    // Simulate token creation process
    setTimeout(() => {
      const mockAddress = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      setTokenAddress(mockAddress);
      setIsCreated(true);
      setIsCreating(false);
      
      toast({
        title: "Token Created Successfully! 🎉",
        description: `Your ${tokenData.symbol} token is now live on Solana ${tokenData.network}!`,
      });
    }, 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Token address copied to clipboard",
    });
  };

  const getNetworkConfig = () => {
    if (tokenData.network === 'mainnet') {
      return {
        name: 'Mainnet Beta',
        rpc: 'https://api.mainnet-beta.solana.com',
        explorer: 'https://explorer.solana.com',
        color: 'from-green-500 to-emerald-500'
      };
    }
    return {
      name: 'Devnet',
      rpc: 'https://api.devnet.solana.com',
      explorer: 'https://explorer.solana.com/?cluster=devnet',
      color: 'from-orange-500 to-yellow-500'
    };
  };

  const networkConfig = getNetworkConfig();

  return (
    <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Coins className="w-6 h-6 text-purple-400" />
            <span>Token Creation Panel</span>
          </h2>
          <Badge className={`bg-gradient-to-r ${networkConfig.color} text-white`}>
            {networkConfig.name}
          </Badge>
        </div>

        {/* Token Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <Hash className="w-4 h-4 text-purple-400" />
                <span className="text-purple-200 text-sm">Token Name</span>
              </div>
              <p className="text-white font-semibold">{tokenData.name || 'Unnamed Token'}</p>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-blue-200 text-sm">Symbol</span>
              </div>
              <p className="text-white font-semibold">{tokenData.symbol || 'TOKEN'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-green-400" />
                <span className="text-green-200 text-sm">Total Supply</span>
              </div>
              <p className="text-white font-semibold">
                {tokenData.supply?.toLocaleString() || '1,000,000'}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-200 text-sm">Decimals</span>
              </div>
              <p className="text-white font-semibold">{tokenData.decimals || 9}</p>
            </div>
          </div>
        </div>

        {/* Network Configuration */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
            <Globe className="w-4 h-4 text-purple-400" />
            <span>Network Configuration</span>
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">RPC Endpoint:</span>
              <span className="text-purple-300 font-mono">{networkConfig.rpc}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Explorer:</span>
              <span className="text-purple-300">{networkConfig.explorer}</span>
            </div>
          </div>
        </div>

        {/* Token Address (if created) */}
        {isCreated && tokenAddress && (
          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-300 font-semibold">Token Address</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(tokenAddress)}
                className="text-green-300 hover:text-green-200"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-green-100 font-mono text-sm break-all">{tokenAddress}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-center">
          {!isCreated ? (
            <Button
              onClick={handleCreateToken}
              disabled={isCreating}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-3 text-lg font-semibold"
            >
              {isCreating ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Token...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Create Token Now</span>
                </div>
              )}
            </Button>
          ) : (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-green-400">
                <CheckCircle className="w-6 h-6" />
                <span className="text-xl font-semibold">Token Created Successfully!</span>
              </div>
              <p className="text-green-300">Your token is now live on Solana {networkConfig.name}</p>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/30">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="text-orange-200 text-sm">
              <strong>Demo Notice:</strong> This is a demonstration interface. In a production environment, 
              this would connect to actual Solana APIs using your wallet and create real tokens on the blockchain. 
              Always test on devnet before deploying to mainnet!
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TokenCreationPanel;
