
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AirdropCreator from '@/components/AirdropCreator';
import AirdropDashboard from '@/components/AirdropDashboard';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    loadMainnetTokens();
  }, []);

  const loadMainnetTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('network', 'mainnet')
        .eq('status', 'completed');

      if (error) throw error;
      setMainnetTokens(data || []);
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
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="create">Create Campaign</TabsTrigger>
                <TabsTrigger value="manage">Manage Campaigns</TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="space-y-6">
                <AirdropCreator mainnetTokens={mainnetTokens} />
              </TabsContent>
              
              <TabsContent value="manage" className="space-y-6">
                <AirdropDashboard />
              </TabsContent>
            </Tabs>
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
