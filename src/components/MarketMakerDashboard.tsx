
import React, { useEffect } from 'react';
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
  DollarSign
} from 'lucide-react';
import { useMarketMaker, MarketMakerBot } from '../hooks/useMarketMaker';

interface MarketMakerDashboardProps {
  botId?: string;
}

const MarketMakerDashboard: React.FC<MarketMakerDashboardProps> = ({ botId }) => {
  const { bots, trades, loading, fetchTrades, updateBotStatus } = useMarketMaker();
  
  const currentBot = botId ? bots.find(bot => bot.id === botId) : bots[0];

  useEffect(() => {
    if (currentBot?.id) {
      fetchTrades(currentBot.id);
    }
  }, [currentBot?.id, fetchTrades]);

  const getStatusColor = (status: MarketMakerBot['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'stopped': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const handleStatusChange = async (newStatus: MarketMakerBot['status']) => {
    if (!currentBot) return;
    
    try {
      await updateBotStatus(currentBot.id, newStatus);
    } catch (error) {
      console.error('Failed to update bot status:', error);
    }
  };

  if (loading) {
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

  return (
    <div className="space-y-6">
      {/* Bot Status Card */}
      <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Bot className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">
              {currentBot.token_symbol} Market Maker Bot
            </h2>
          </div>
          <Badge className={`${getStatusColor(currentBot.status)} text-white`}>
            {currentBot.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 text-sm">Total Volume</span>
            </div>
            <p className="text-white font-semibold text-lg">
              ${(currentBot.total_volume || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300 text-sm">Total Trades</span>
            </div>
            <p className="text-white font-semibold text-lg">
              {(currentBot.total_trades || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-300 text-sm">Duration</span>
            </div>
            <p className="text-white font-semibold text-lg">
              {currentBot.duration_hours}h
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300 text-sm">Package Size</span>
            </div>
            <p className="text-white font-semibold text-lg">
              {currentBot.package_size}
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-3">
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
            <Button
              onClick={() => handleStatusChange('paused')}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause Bot
            </Button>
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

      {/* Recent Trades */}
      <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Recent Trades</h3>
        {trades.length > 0 ? (
          <div className="space-y-2">
            {trades.slice(0, 10).map((trade) => (
              <div key={trade.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge className={trade.trade_type === 'buy' ? 'bg-green-500' : 'bg-red-500'}>
                    {trade.trade_type.toUpperCase()}
                  </Badge>
                  <span className="text-white">
                    {trade.amount.toFixed(6)} {currentBot.token_symbol}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-white">${trade.price.toFixed(6)}</p>
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
