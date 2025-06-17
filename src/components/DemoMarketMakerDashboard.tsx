
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
import { 
  generateMockMarketMakerBot, 
  generateMockTrades, 
  generateMockMarketData, 
  generateMockTradingStats 
} from '../hooks/useDemoMode';

const DemoMarketMakerDashboard: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [currentBot] = useState(generateMockMarketMakerBot());
  const [trades]= useState(generateMockTrades());
  const [tradingStats] = useState(generateMockTradingStats());
  const [marketData] = useState(generateMockMarketData());

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate loading delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleManualTrade = async () => {
    // Simulate manual trade execution
    console.log('Manual trade executed (demo)');
  };

  const handleStatusChange = async (newStatus: string) => {
    console.log(`Bot status changed to: ${newStatus} (demo)`);
  };

  const getStatusColor = (status: string) => {
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
              ${tradingStats.totalVolume.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300 text-sm">Total Trades</span>
            </div>
            <p className="text-white font-semibold text-lg">
              {tradingStats.totalTrades.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300 text-sm">Avg Price</span>
            </div>
            <p className="text-white font-semibold text-lg">
              ${tradingStats.averagePrice.toFixed(6)}
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-300 text-sm">Time Left</span>
            </div>
            <p className="text-white font-semibold text-lg">
              {tradingStats.hoursRemaining.toFixed(1)}h
            </p>
          </div>
        </div>

        {/* Market Data Section */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 mb-6 border border-blue-500/30">
          <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>Live Market Data (Demo)</span>
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

        {/* Enhanced Control Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => handleStatusChange('paused')}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause Bot
          </Button>
          
          <Button
            onClick={handleManualTrade}
            variant="outline"
            className="border-blue-300 text-blue-300 hover:bg-blue-300 hover:text-blue-900"
          >
            <Zap className="w-4 h-4 mr-2" />
            Execute Trade (Demo)
          </Button>
          
          <Button
            onClick={() => handleStatusChange('stopped')}
            variant="destructive"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop Bot
          </Button>
        </div>
      </Card>

      {/* Enhanced Recent Trades */}
      <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Recent Trades (Demo)</h3>
          <p className="text-gray-400 text-sm">
            Last trade: {new Date(tradingStats.lastTradeTime).toLocaleTimeString()}
          </p>
        </div>
        <div className="space-y-2">
          {trades.map((trade) => (
            <div key={trade.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge className={trade.trade_type === 'buy' ? 'bg-green-500' : 'bg-red-500'}>
                  {trade.trade_type.toUpperCase()}
                </Badge>
                <span className="text-white">
                  {Number(trade.amount).toFixed(6)} {currentBot.token_symbol}
                </span>
                <span className="text-gray-400 text-sm">
                  (Simulated)
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
      </Card>
    </div>
  );
};

export default DemoMarketMakerDashboard;
