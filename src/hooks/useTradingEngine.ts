
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TradingEngineStats {
  botId: string;
  totalTrades: number;
  totalVolume: number;
  hoursRemaining: number;
  averagePrice: number;
  lastTradeTime?: string;
}

export interface MarketData {
  price: number;
  liquidity: number;
  volume24h: number;
}

export const useTradingEngine = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const executeManualTrade = async (botId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('market-maker-engine', {
        body: { botId, action: 'execute_trades' }
      });

      if (error) throw error;

      toast({
        title: "Trade Executed",
        description: `Manual trade completed for bot ${botId}`,
      });

      return data;
    } catch (error) {
      console.error('Manual trade execution failed:', error);
      toast({
        title: "Trade Failed",
        description: error.message || "Failed to execute manual trade",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getMarketData = async (mintAddress: string): Promise<MarketData> => {
    try {
      const { data, error } = await supabase.functions.invoke('market-maker-engine', {
        body: { 
          botId: null, 
          action: 'get_market_data',
          mintAddress 
        }
      });

      if (error) throw error;
      return data.data;
    } catch (error) {
      console.error('Failed to get market data:', error);
      return {
        price: 0.001,
        liquidity: 10000,
        volume24h: 5000
      };
    }
  };

  const getTradingStats = async (botId: string): Promise<TradingEngineStats | null> => {
    try {
      // Get bot data
      const { data: bot, error: botError } = await supabase
        .from('market_maker_bots')
        .select('*')
        .eq('id', botId)
        .single();

      if (botError || !bot) return null;

      // Get recent trades for average price calculation
      const { data: recentTrades, error: tradesError } = await supabase
        .from('market_maker_trades')
        .select('price, created_at')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (tradesError) {
        console.error('Error fetching trades:', tradesError);
      }

      const averagePrice = recentTrades && recentTrades.length > 0
        ? recentTrades.reduce((sum, trade) => sum + Number(trade.price), 0) / recentTrades.length
        : 0;

      const timeSinceStart = bot.start_time 
        ? (new Date().getTime() - new Date(bot.start_time).getTime()) / (1000 * 60 * 60)
        : 0;
      
      const hoursRemaining = Math.max(0, bot.duration_hours - timeSinceStart);

      return {
        botId: bot.id,
        totalTrades: bot.total_trades || 0,
        totalVolume: Number(bot.total_volume) || 0,
        hoursRemaining,
        averagePrice,
        lastTradeTime: recentTrades?.[0]?.created_at
      };

    } catch (error) {
      console.error('Failed to get trading stats:', error);
      return null;
    }
  };

  const startScheduler = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('market-maker-scheduler', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Scheduler Started",
        description: "Market maker scheduler is now running",
      });

      return data;
    } catch (error) {
      console.error('Failed to start scheduler:', error);
      toast({
        title: "Scheduler Failed",
        description: error.message || "Failed to start market maker scheduler",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    isLoading,
    executeManualTrade,
    getMarketData,
    getTradingStats,
    startScheduler
  };
};
