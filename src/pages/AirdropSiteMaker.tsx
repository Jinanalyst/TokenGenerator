import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AirdropCreator from '@/components/AirdropCreator';
import AirdropDashboard from '@/components/AirdropDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/hooks/useDemoMode';
import DemoBanner from '@/components/DemoBanner';

interface Token {
  id: string;
  name: string;
  symbol: string;
  mint_address: string;
  status: string;
  network: string;
}

const AirdropSiteMaker = () => {
  const [mainnetTokens, setMainnetTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const { isDemoMode, setIsDemoMode } = useDemoMode();

  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, create a mock token
      const mockTokens = [{
        id: 'demo-token-1',
        name: 'Demo Token',
        symbol: 'DEMO',
        mint_address: '11111111111111111111111111111112',
        status: 'completed',
        network: 'mainnet'
      }];
      setMainnetTokens(mockTokens);
      setSelectedToken(mockTokens[0]);
    } else {
      loadMainnetTokens();
    }
  }, [isDemoMode]);

  const loadMainnetTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('network', 'mainnet')
        .eq('status', 'completed');

      if (error) throw error;
      setMainnetTokens(data || []);
      
      // Auto-select first token if available
      if (data && data.length > 0) {
        setSelectedToken(data[0]);
      }
    } catch (error) {
      console.error('Failed to load mainnet tokens:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-blue-500/10"></div>
      </div>
      
      {/* Header */}
      <div className="relative z-10 pt-8 pb-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <Link to="/app">
              <Button variant="outline" size="sm" className="border-purple-300 text-purple-300 hover:bg-purple-300 hover:text-purple-900 backdrop-blur-sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            
            <div className="flex items-center space-x-3">
              <Label className="text-white">Demo Mode</Label>
              <Switch 
                checked={isDemoMode} 
                onCheckedChange={setIsDemoMode}
              />
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
                <span className="text-white font-bold text-xl">🎁</span>
              </div>
              <h1 className="text-4xl font-bold text-white">
                Airdrop Site Maker
              </h1>
            </div>
            <p className="text-purple-200 text-lg max-w-2xl mx-auto">
              Create custom airdrop campaigns and claim sites for your Solana tokens. 
              Distribute tokens to your community with ease!
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1">
        <div className="container mx-auto px-4 pb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            {mainnetTokens.length === 0 && !isDemoMode ? (
              <div className="text-center py-12">
                <p className="text-white text-lg mb-4">No mainnet tokens found.</p>
                <p className="text-purple-200">Please create a mainnet token first to use the Airdrop Site Maker.</p>
                <Link to="/app">
                  <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                    Create Token
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Token Selection */}
                <div className="mb-6">
                  <h3 className="text-white text-lg font-semibold mb-3">
                    Select Token for Airdrop:
                    {isDemoMode && <span className="text-blue-300 text-sm ml-2">(Demo Mode)</span>}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {mainnetTokens.map((token) => (
                      <Button
                        key={token.id}
                        onClick={() => setSelectedToken(token)}
                        variant={selectedToken?.id === token.id ? "default" : "outline"}
                        className={selectedToken?.id === token.id 
                          ? "bg-purple-600 text-white" 
                          : "border-purple-300 text-purple-300 hover:bg-purple-300 hover:text-purple-900"
                        }
                      >
                        {token.name} ({token.symbol})
                        {isDemoMode && <span className="ml-1 text-xs">(Demo)</span>}
                      </Button>
                    ))}
                  </div>
                </div>

                <Tabs defaultValue="create" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="create">Create Campaign</TabsTrigger>
                    <TabsTrigger value="manage">Manage Campaigns</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="create" className="space-y-6">
                    {selectedToken ? (
                      <AirdropCreator 
                        tokenAddress={selectedToken.mint_address}
                        tokenName={selectedToken.name}
                        tokenSymbol={selectedToken.symbol}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-white">Please select a token to create an airdrop campaign.</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="manage" className="space-y-6">
                    <AirdropDashboard />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-purple-500 rounded-full opacity-10 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-500 rounded-full opacity-10 animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 right-20 w-16 h-16 bg-indigo-500 rounded-full opacity-10 animate-pulse delay-500"></div>
    </div>
  );
};

export default AirdropSiteMaker;
