
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, 
  Bot, 
  TrendingUp, 
  Settings, 
  Play, 
  Pause, 
  Square, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Coins,
  BarChart3,
  Clock,
  Eye,
  Wallet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSolana } from '../hooks/useSolana';
import { useMarketMaker } from '../hooks/useMarketMaker';
import { usePaymentProcessor } from '../hooks/usePaymentProcessor';
import { useDemoMode, generateMockMarketMakerBot, generateMockTrades, generateMockMarketData, generateMockTradingStats } from '../hooks/useDemoMode';
import MarketMakerDashboard from '../components/MarketMakerDashboard';
import DemoBanner from '../components/DemoBanner';

const MarketMaker = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createBot } = useMarketMaker();
  const { processPayment, isProcessing } = usePaymentProcessor();
  const { isDemoMode, setIsDemoMode } = useDemoMode();
  
  // Token data from URL params or demo data
  const tokenMintAddress = isDemoMode ? '11111111111111111111111111111112' : (searchParams.get('mint') || '11111111111111111111111111111112');
  const tokenSymbol = isDemoMode ? 'DEMO' : (searchParams.get('symbol') || 'TOKEN');
  const tokenName = isDemoMode ? 'Demo Token' : (searchParams.get('name') || 'Token');
  const network = isDemoMode ? 'mainnet' : (searchParams.get('network') || 'mainnet');
  
  // Bot configuration state
  const [botConfig, setBotConfig] = useState({
    packageSize: 100,
    volumeTarget: 10000,
    priceMin: 0,
    priceMax: 0,
    tradeFrequency: 60,
    duration: 24
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [isMainnet, setIsMainnet] = useState(network === 'mainnet');
  const [wallet, setWallet] = useState<any>(isDemoMode ? { connected: true } : null);
  const [showDashboard, setShowDashboard] = useState(false);
  
  const solana = useSolana('mainnet');

  useEffect(() => {
    // In demo mode, always show as mainnet with connected wallet
    if (isDemoMode) {
      setIsMainnet(true);
      setWallet({ connected: true });
      return;
    }

    // Check if we have required token data
    if (!tokenMintAddress || tokenMintAddress === '11111111111111111111111111111112' || 
        !tokenSymbol || tokenSymbol === 'TOKEN' || 
        !tokenName || tokenName === 'Token') {
      toast({
        title: "Missing Token Data",
        description: "Please create a token first to access market maker features",
        variant: "destructive"
      });
      navigate('/app');
      return;
    }

    // Check if network is mainnet
    setIsMainnet(network === 'mainnet');
    
    // Get wallet connection
    // This would be passed from a wallet provider context in a real app
    setWallet(null); // Placeholder
  }, [tokenMintAddress, tokenSymbol, tokenName, network, navigate, toast, isDemoMode]);

  const handleConfigChange = (field: string, value: number | number[]) => {
    setBotConfig(prev => ({
      ...prev,
      [field]: Array.isArray(value) ? value[0] : value
    }));
  };

  const calculatePrice = () => {
    return (botConfig.packageSize / 100) * 0.3; // 0.3 SOL per 100 makers
  };

  const handleCreateBot = async () => {
    if (isDemoMode) {
      // Demo mode - simulate bot creation and show dashboard
      setIsCreating(true);
      
      setTimeout(() => {
        toast({
          title: "Demo Bot Created! 🤖",
          description: `Demo market maker bot activated for ${tokenSymbol}. This is a simulation.`,
        });
        setShowDashboard(true);
        setIsCreating(false);
      }, 2000);
      return;
    }

    if (!isMainnet) {
      toast({
        title: "Mainnet Required",
        description: "Market maker bots are only available on Solana Mainnet",
        variant: "destructive"
      });
      return;
    }

    if (!wallet) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to create market maker bots",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const price = calculatePrice();
      
      // Create bot in database first
      const botData = await createBot({
        user_id: 'placeholder-user-id', // This would come from auth context
        token_mint_address: tokenMintAddress!,
        token_symbol: tokenSymbol!,
        token_name: tokenName!,
        package_size: botConfig.packageSize,
        payment_amount: price,
        volume_target: botConfig.volumeTarget,
        price_min: botConfig.priceMin,
        price_max: botConfig.priceMax,
        trade_frequency: botConfig.tradeFrequency,
        duration_hours: botConfig.duration,
        status: 'pending'
      });

      // Process real payment
      const paymentResult = await processPayment(botData.id, wallet);
      
      if (paymentResult.success) {
        toast({
          title: "Market Maker Bot Activated! 🤖",
          description: `Payment confirmed. Your bot is now generating volume for ${tokenSymbol}`,
        });

        // Navigate to bot dashboard
        navigate(`/market-maker/dashboard?botId=${botData.id}`);
      }
      
    } catch (error) {
      console.error('Bot creation failed:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create market maker bot. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  // If showing dashboard in demo mode, render the dashboard with mock data
  if (showDashboard && isDemoMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-blue-500/10"></div>
        </div>
        
        <div className="relative z-10 pt-8 pb-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <Button 
                onClick={() => setShowDashboard(false)}
                variant="outline" 
                size="sm" 
                className="border-purple-300 text-purple-300 hover:bg-purple-300 hover:text-purple-900 backdrop-blur-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Configuration
              </Button>
              
              <div className="flex items-center space-x-3">
                <Label className="text-white">Demo Mode</Label>
                <Switch 
                  checked={isDemoMode} 
                  onCheckedChange={setIsDemoMode}
                />
              </div>
            </div>

            <DemoBanner type="market-maker" className="mb-6" />
            
            <MarketMakerDashboard botId="demo-bot-1" />
          </div>
        </div>
      </div>
    );
  }

  if (!isMainnet && !isDemoMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-blue-500/10"></div>
        </div>
        
        <div className="relative z-10 pt-8 pb-4">
          <div className="container mx-auto px-4">
            <Link to="/app">
              <Button variant="outline" size="sm" className="border-purple-300 text-purple-300 hover:bg-purple-300 hover:text-purple-900 backdrop-blur-sm mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to App
              </Button>
            </Link>
            
            <div className="max-w-2xl mx-auto text-center">
              <Card className="bg-orange-500/10 backdrop-blur-lg border-orange-500/30 p-8">
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-center">
                    <AlertTriangle className="w-16 h-16 text-orange-400" />
                  </div>
                  
                  <h1 className="text-3xl font-bold text-white">
                    Mainnet Required
                  </h1>
                  
                  <p className="text-orange-200 text-lg">
                    Market Maker Bots and Liquidity Pool features are only available on Solana Mainnet. 
                    Please create your token on Mainnet to access these premium features.
                  </p>
                  
                  <div className="bg-orange-500/20 rounded-lg p-4 border border-orange-500/30">
                    <p className="text-orange-100 text-sm">
                      <strong>Current Network:</strong> {network === 'devnet' ? 'Devnet (Testing)' : 'Unknown'}
                    </p>
                    <p className="text-orange-100 text-sm mt-1">
                      <strong>Required Network:</strong> Mainnet (Live Trading)
                    </p>
                  </div>
                  
                  <Link to="/app">
                    <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-3">
                      Create Mainnet Token
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-blue-500/10"></div>
      </div>
      
      <div className="relative z-10 pt-8 pb-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <Link to="/app">
              <Button variant="outline" size="sm" className="border-purple-300 text-purple-300 hover:bg-purple-300 hover:text-purple-900 backdrop-blur-sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to App
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

          {isDemoMode && <DemoBanner type="market-maker" className="mb-6" />}
          
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-400 to-blue-400 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white">
                  Market Maker Bot
                </h1>
              </div>
              <p className="text-purple-200 text-lg">
                Generate organic trading volume and improve market presence for your token
              </p>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white mt-2">
                {isDemoMode ? 'Demo Mode' : 'Mainnet Only'}
              </Badge>
            </div>

            {/* Token Info */}
            <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-purple-300 text-sm">Token Name</p>
                  <p className="text-white font-semibold text-lg">{tokenName}</p>
                </div>
                <div>
                  <p className="text-purple-300 text-sm">Symbol</p>
                  <p className="text-white font-semibold text-lg">{tokenSymbol}</p>
                </div>
                <div>
                  <p className="text-purple-300 text-sm">Network</p>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    {isDemoMode ? 'Demo' : 'Mainnet'}
                  </Badge>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Configuration Panel */}
              <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Settings className="w-6 h-6 text-purple-400" />
                  <span>Bot Configuration</span>
                </h2>
                
                <div className="space-y-6">
                  {/* Package Size */}
                  <div>
                    <Label className="text-white font-semibold mb-3 block flex items-center space-x-2">
                      <Bot className="w-4 h-4 text-blue-400" />
                      <span>Market Makers ({botConfig.packageSize})</span>
                    </Label>
                    <Slider
                      value={[botConfig.packageSize]}
                      onValueChange={(value) => handleConfigChange('packageSize', value)}
                      min={50}
                      max={500}
                      step={50}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-400 mt-1">
                      <span>50</span>
                      <span>500</span>
                    </div>
                  </div>

                  {/* Volume Target */}
                  <div>
                    <Label className="text-white font-semibold mb-3 block flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-green-400" />
                      <span>Daily Volume Target (USD)</span>
                    </Label>
                    <Input
                      type="number"
                      value={botConfig.volumeTarget}
                      onChange={(e) => handleConfigChange('volumeTarget', parseInt(e.target.value) || 0)}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="10000"
                    />
                  </div>

                  {/* Price Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white font-semibold mb-2 block">Min Price ($)</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={botConfig.priceMin}
                        onChange={(e) => handleConfigChange('priceMin', parseFloat(e.target.value) || 0)}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="0.0001"
                      />
                    </div>
                    <div>
                      <Label className="text-white font-semibold mb-2 block">Max Price ($)</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={botConfig.priceMax}
                        onChange={(e) => handleConfigChange('priceMax', parseFloat(e.target.value) || 0)}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="0.01"
                      />
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <Label className="text-white font-semibold mb-3 block flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span>Duration (Hours: {botConfig.duration})</span>
                    </Label>
                    <Slider
                      value={[botConfig.duration]}
                      onValueChange={(value) => handleConfigChange('duration', value)}
                      min={24}
                      max={720}
                      step={24}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-400 mt-1">
                      <span>1 Day</span>
                      <span>30 Days</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Pricing & Features */}
              <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Coins className="w-6 h-6 text-yellow-400" />
                  <span>Pricing & Features</span>
                </h2>
                
                <div className="space-y-6">
                  {/* Pricing */}
                  <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg p-6 border border-green-500/30">
                    <div className="text-center">
                      <p className="text-green-300 text-sm mb-2">Total Cost</p>
                      <p className="text-4xl font-bold text-white mb-2">
                        {isDemoMode ? '0.00' : calculatePrice().toFixed(2)} SOL
                      </p>
                      <p className="text-green-200 text-sm">
                        {botConfig.packageSize} Market Makers × {botConfig.duration}h
                        {isDemoMode && <span className="block text-blue-300">(Demo - No Payment Required)</span>}
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <h3 className="text-white font-semibold flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Included Features</span>
                    </h3>
                    <ul className="text-purple-200 text-sm space-y-2">
                      <li className="flex items-center space-x-2">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span>Organic volume generation</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Zap className="w-3 h-3 text-blue-400" />
                        <span>Price stability control</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <BarChart3 className="w-3 h-3 text-purple-400" />
                        <span>Real-time analytics dashboard</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Bot className="w-3 h-3 text-orange-400" />
                        <span>24/7 automated trading</span>
                      </li>
                    </ul>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={handleCreateBot}
                    disabled={isCreating || (!isDemoMode && (isProcessing || !wallet))}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white py-4 text-lg font-semibold"
                  >
                    {isCreating || isProcessing ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>{isProcessing ? 'Processing Payment...' : 'Creating Bot...'}</span>
                      </div>
                    ) : isDemoMode ? (
                      <div className="flex items-center space-x-2">
                        <Eye className="w-5 h-5" />
                        <span>Launch Demo Market Maker Bot</span>
                      </div>
                    ) : !wallet ? (
                      <div className="flex items-center space-x-2">
                        <Wallet className="w-5 h-5" />
                        <span>Connect Wallet to Continue</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Play className="w-5 h-5" />
                        <span>Launch Market Maker Bot (Pay {calculatePrice().toFixed(2)} SOL)</span>
                      </div>
                    )}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Disclaimer */}
            {!isDemoMode && (
              <Card className="bg-orange-500/10 backdrop-blur-lg border-orange-500/30 p-4 mt-8">
                <p className="text-orange-200 text-sm text-center">
                  <strong>Notice:</strong> Market maker bots process real payments and generate actual trading volume on Solana DEX platforms. 
                  Payments are processed immediately upon confirmation. All transactions are recorded on the blockchain and cannot be reversed.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketMaker;
