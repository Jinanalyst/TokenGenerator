
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Zap, Shield, Code, CheckCircle, XCircle } from 'lucide-react';
import { useSolana } from '../hooks/useSolana';

const SolanaConfig = () => {
  const mainnet = useSolana('mainnet');
  const devnet = useSolana('devnet');

  const networks = [
    {
      name: 'Mainnet Beta',
      rpc: 'https://api.mainnet-beta.solana.com',
      websocket: 'wss://api.mainnet-beta.solana.com/',
      explorer: 'https://explorer.solana.com',
      status: 'Live',
      description: 'Production network with real SOL',
      color: 'from-green-500 to-emerald-500',
      icon: <Zap className="w-4 h-4" />,
      connection: mainnet
    },
    {
      name: 'Devnet',
      rpc: 'https://api.devnet.solana.com',
      websocket: 'wss://api.devnet.solana.com/',
      explorer: 'https://explorer.solana.com/?cluster=devnet',
      status: 'Development',
      description: 'Testing network with free SOL',
      color: 'from-orange-500 to-yellow-500',
      icon: <Code className="w-4 h-4" />,
      connection: devnet
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Solana Network Configuration</h2>
        <p className="text-purple-200">Connected to both mainnet and devnet</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {networks.map((network) => (
          <Card key={network.name} className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-full bg-gradient-to-r ${network.color}`}>
                    {network.icon}
                  </div>
                  <h3 className="text-white font-semibold text-lg">{network.name}</h3>
                </div>
                <Badge className={`bg-gradient-to-r ${network.color} text-white`}>
                  {network.status}
                </Badge>
              </div>

              <p className="text-gray-300 text-sm">{network.description}</p>

              <div className="space-y-3">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center space-x-2 mb-1">
                    <Globe className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-200 text-xs">RPC Endpoint</span>
                  </div>
                  <p className="text-white font-mono text-sm break-all">{network.rpc}</p>
                </div>

                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center space-x-2 mb-1">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span className="text-blue-200 text-xs">WebSocket</span>
                  </div>
                  <p className="text-white font-mono text-sm break-all">{network.websocket}</p>
                </div>

                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center space-x-2 mb-1">
                    <Shield className="w-3 h-3 text-green-400" />
                    <span className="text-green-200 text-xs">Explorer</span>
                  </div>
                  <p className="text-white font-mono text-sm break-all">{network.explorer}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-center space-x-2">
                  {network.connection.isConnected ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm">Connected & Ready</span>
                    </>
                  ) : network.connection.isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></div>
                      <span className="text-yellow-400 text-sm">Connecting...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm">Connection Failed</span>
                    </>
                  )}
                </div>
                {network.connection.error && (
                  <p className="text-red-300 text-xs mt-1 text-center">{network.connection.error}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SolanaConfig;
