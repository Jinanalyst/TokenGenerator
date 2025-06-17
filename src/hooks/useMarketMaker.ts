
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MarketMakerBot {
  id: string;
  user_id: string;
  token_mint_address: string;
  token_symbol: string;
  token_name: string;
  package_size: number;
  payment_amount: number;
  payment_signature: string | null;
  status: 'pending' | 'active' | 'paused' | 'stopped' | 'completed';
  volume_target: number | null;
  price_min: number | null;
  price_max: number | null;
  trade_frequency: number | null;
  duration_hours: number;
  start_time: string | null;
  end_time: string | null;
  total_trades: number | null;
  total_volume: number | null;
  created_at: string;
  updated_at: string;
}

export interface MarketMakerTrade {
  id: string;
  bot_id: string;
  transaction_signature: string;
  trade_type: 'buy' | 'sell';
  amount: number;
  price: number;
  created_at: string;
}

export const useMarketMaker = () => {
  const [bots, setBots] = useState<MarketMakerBot[]>([]);
  const [trades, setTrades] = useState<MarketMakerTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('market_maker_bots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBots(data || []);
    } catch (error) {
      console.error('Error fetching bots:', error);
      toast({
        title: "Error",
        description: "Failed to fetch market maker bots",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async (botId: string) => {
    try {
      const { data, error } = await supabase
        .from('market_maker_trades')
        .select('*')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  };

  const createBot = async (botConfig: Partial<MarketMakerBot>) => {
    try {
      const { data, error } = await supabase
        .from('market_maker_bots')
        .insert(botConfig)
        .select()
        .single();

      if (error) throw error;
      
      setBots(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating bot:', error);
      throw error;
    }
  };

  const updateBotStatus = async (botId: string, status: MarketMakerBot['status']) => {
    try {
      const { data, error } = await supabase
        .from('market_maker_bots')
        .update({ status })
        .eq('id', botId)
        .select()
        .single();

      if (error) throw error;
      
      setBots(prev => prev.map(bot => 
        bot.id === botId ? { ...bot, status } : bot
      ));
      
      return data;
    } catch (error) {
      console.error('Error updating bot status:', error);
      throw error;
    }
  };

  const simulatePayment = async (botId: string, paymentSignature: string) => {
    try {
      const { data, error } = await supabase
        .from('market_maker_bots')
        .update({ 
          payment_signature: paymentSignature,
          status: 'active',
          start_time: new Date().toISOString()
        })
        .eq('id', botId)
        .select()
        .single();

      if (error) throw error;
      
      setBots(prev => prev.map(bot => 
        bot.id === botId ? data : bot
      ));
      
      return data;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  return {
    bots,
    trades,
    loading,
    fetchBots,
    fetchTrades,
    createBot,
    updateBotStatus,
    simulatePayment
  };
};
