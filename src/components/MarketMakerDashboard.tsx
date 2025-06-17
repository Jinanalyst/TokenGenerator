import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Play, 
  Pause, 
  Square, 
  TrendingUp, 
  BarChart3,
  Clock,
  DollarSign,
  Zap,
  RefreshCw,
  Activity,
  Target
} from 'lucide-react';
import { useMarketMaker, MarketMakerBot } from '../hooks/useMarketMaker';
import { useTradingEngine, TradingEngineStats, MarketData } from '../hooks/useTradingEngine';
import { useDemoMode, generateMockMarketMakerBot, generateMockTrades, generateMockMarketData, generateMockTradingStats } from '../hooks/useDemoMode';

interface MarketMakerDashboardProps {
  botId?: string;
}

const MarketMakerDashboard: React.FC<MarketMakerDashboardProps> = ({ botId }) => {
  const { bots, trades, loading, fetchTrades, updateBotStatus } = useMarketMaker();
  const { 
    isLoading: engineLoading, 
    executeManualTrade, 
    getMarketData, 
    getTradingStats,
    startScheduler 
  } = useTradingEngine();
  const { isDemoMode } = useDemoMode();
  
  const [tradingStats, setTradingStats] = useState<TradingEngineStats | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Use demo data if in demo mode and botId is demo-bot-1
  const isDemoBot = botId === 'demo-bot-1';
  const currentBot = isDemoBot && isDemoMode 
    ? generateMockMarketMakerBot() 
    : botId ? bots.find(bot => bot.id === botId) : bots[0];

  const currentTrades = isDemoBot && isDemoMode 
    ? generateMockTrades() 
    : trades;

  useEffect(() => {
    if (isDemoBot && isDemoMode) {
      // Use demo data
      setTradingStats(generateMockTradingStats());
      setMarketData(generateMockMarketData());
      return;
    }

    if (currentBot?.id && !isDemoMode) {
      fetchTrades(currentBot.id);
      loadTradingData();
    }
  }, [currentBot?.id, fetchTrades, isDemoBot, isDemoMode]);

  const loadTradingData = async () => {
    if (!currentBot || isDemoMode) return;
    
    try {
      const [stats, market] = await Promise.all([
        getTradingStats(currentBot.id),
        getMarketData(currentBot.token_mint_address)
      ]);
      
      setTradingStats(stats);
      setMarketData(market);
    } catch (error) {
      console.error('Failed to load trading data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (isDemoMode) {
        // Simulate refresh delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        await loadTradingData();
        if (currentBot?.id) {
          await fetchTrades(currentBot.id);
        }
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualTrade = async () => {
    if (!currentBot) return;
    
    if (isDemoMode) {
      console.log('Manual trade executed (demo mode)');
      return;
    }
    
    try {
      await executeManualTrade(currentBot.id);
      await loadTradingData();
      await fetchTrades(currentBot.id);
    } catch (error) {
      console.error('Manual trade failed:', error);
    }
  };

  const handleStatusChange = async (newStatus: MarketMakerBot['status']) => {
    if (!currentBot) return;
    
    if (isDemoMode) {
      console.log(`Bot status changed to: ${newStatus} (demo mode)`);
      return;
    }
    
    try {
      await updateBotStatus(currentBot.id, newStatus);
      if (newStatus === 'active') {
        // Start the scheduler when bot becomes active
        await startScheduler();
      }
    } catch (error) {
      console.error('Failed to update bot status:', error);
    }
  };

  if (loading && !isDemoMode) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-purple-300 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentBot) {
    return (
      <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
        <p className="text-white text-center">No market maker bot found</p>
      </Card>
    );
  }

  const getStatusColor = (status: MarketMakerBot['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'stopped': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Bot Status Card */}
      <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Bot className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">
              {currentBot.token_symbol} Market Maker Bot
              {isDemoMode && <span className="text-blue-300 text-sm ml-2">(Demo)</span>}
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className={`${getStatusColor(currentBot.status)} text-white`}>
              {currentBot.status.toUpperCase()}
            </Badge>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="border-purple-300"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 text-sm">Total Volume</span>
            </div>
            <p className="text-white font-semibold text-lg">
              ${(tradingStats?.totalVolume || currentBot.total_volume || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300 text-sm">Total Trades</span>
            </div>
            <p className="text-white font-semibold text-lg">
              {(tradingStats?.totalTrades || currentBot.total_trades || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300 text-sm">Avg Price</span>
            </div>
            <p className="text-white font-semibold text-lg">
              ${(tradingStats?.averagePrice || 0).toFixed(6)}
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-300 text-sm">Time Left</span>
            </div>
            <p className="text-white font-semibold text-lg">
              {tradingStats?.hoursRemaining ? `${tradingStats.hoursRemaining.toFixed(1)}h` : `${currentBot.duration_hours}h`}
            </p>
          </div>
        </div>

        {/* Market Data Section */}
        {marketData && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 mb-6 border border-blue-500/30">
            <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Live Market Data{isDemoMode && ' (Demo)'}</span>
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-blue-300 text-sm">Current Price</p>
                <p className="text-white font-semibold">${marketData.price.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-blue-300 text-sm">Liquidity</p>
                <p className="text-white font-semibold">${marketData.liquidity.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-blue-300 text-sm">24h Volume</p>
                <p className="text-white font-semibold">${marketData.volume24h.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Control Buttons */}
        <div className="flex flex-wrap gap-3">
          {currentBot.status === 'pending' && (
            <Button
              onClick={() => handleStatusChange('active')}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Bot
            </Button>
          )}
          
          {currentBot.status === 'active' && (
            <>
              <Button
                onClick={() => handleStatusChange('paused')}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Bot
              </Button>
              
              <Button
                onClick={handleManualTrade}
                disabled={engineLoading && !isDemoMode}
                variant="outline"
                className="border-blue-300 text-blue-300 hover:bg-blue-300 hover:text-blue-900"
              >
                {engineLoading && !isDemoMode ? (
                  <div className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin mr-2"></div>
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Execute Trade{isDemoMode && ' (Demo)'}
              </Button>
            </>
          )}
          
          {currentBot.status === 'paused' && (
            <Button
              onClick={() => handleStatusChange('active')}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Resume Bot
            </Button>
          )}
          
          {(currentBot.status === 'active' || currentBot.status === 'paused') && (
            <Button
              onClick={() => handleStatusChange('stopped')}
              variant="destructive"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Bot
            </Button>
          )}
        </div>
      </Card>

      {/* Enhanced Recent Trades */}
      <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">
            Recent Trades{isDemoMode && ' (Demo)'}
          </h3>
          {tradingStats?.lastTradeTime && (
            <p className="text-gray-400 text-sm">
              Last trade: {new Date(tradingStats.lastTradeTime).toLocaleTimeString()}
            </p>
          )}
        </div>
        {currentTrades.length > 0 ? (
          <div className="space-y-2">
            {currentTrades.slice(0, 10).map((trade) => (
              <div key={trade.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge className={trade.trade_type === 'buy' ? 'bg-green-500' : 'bg-red-500'}>
                    {trade.trade_type.toUpperCase()}
                  </Badge>
                  <span className="text-white">
                    {Number(trade.amount).toFixed(6)} {currentBot.token_symbol}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {isDemoMode || trade.transaction_signature.startsWith('sim_') || trade.transaction_signature.startsWith('demo_') ? '(Simulated)' : ''}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-white">${Number(trade.price).toFixed(6)}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(trade.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center">No trades yet</p>
        )}
      </Card>
    </div>
  );
};

export default MarketMakerDashboard;
