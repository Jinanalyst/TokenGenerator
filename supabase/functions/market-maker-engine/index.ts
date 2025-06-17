
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { 
  Connection, 
  PublicKey,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL
} from "https://esm.sh/@solana/web3.js@1.95.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Raydium API endpoints
const RAYDIUM_API = 'https://api-v3.raydium.io/v2';

interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: number;
  routePlan: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { botId, action = 'execute_trades' } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    // Get bot configuration
    const { data: bot, error: botError } = await supabase
      .from('market_maker_bots')
      .select('*')
      .eq('id', botId)
      .eq('status', 'active')
      .single();

    if (botError || !bot) {
      throw new Error('Active bot not found');
    }

    console.log(`Processing trades for bot ${botId} - ${bot.token_symbol}`);

    if (action === 'execute_trades') {
      return await executeTrades(bot, supabase, connection);
    } else if (action === 'get_market_data') {
      return await getMarketData(bot.token_mint_address);
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Market maker engine error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function executeTrades(bot: any, supabase: any, connection: Connection) {
  try {
    // Calculate trade parameters based on bot configuration
    const currentTime = new Date();
    const timeSinceStart = bot.start_time ? 
      (currentTime.getTime() - new Date(bot.start_time).getTime()) / (1000 * 60 * 60) : 0;
    
    const hoursRemaining = Math.max(0, bot.duration_hours - timeSinceStart);
    
    if (hoursRemaining <= 0) {
      // Bot duration expired, mark as completed
      await supabase
        .from('market_maker_bots')
        .update({ status: 'completed', end_time: currentTime.toISOString() })
        .eq('id', bot.id);

      return new Response(
        JSON.stringify({ message: 'Bot completed - duration expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current market data for the token
    const marketData = await getTokenMarketData(bot.token_mint_address);
    
    // Calculate trade size based on volume target and remaining time
    const hourlyVolumeTarget = bot.volume_target / bot.duration_hours;
    const tradeSize = hourlyVolumeTarget / (60 / (bot.trade_frequency || 60)); // Trades per hour
    
    // Determine trade type (buy/sell) - alternate for balanced volume
    const lastTrade = await getLastTrade(supabase, bot.id);
    const tradeType = !lastTrade || lastTrade.trade_type === 'sell' ? 'buy' : 'sell';
    
    // Execute trade based on type
    let tradeResult;
    if (tradeType === 'buy') {
      tradeResult = await executeBuyTrade(bot, tradeSize, marketData, connection);
    } else {
      tradeResult = await executeSellTrade(bot, tradeSize, marketData, connection);
    }

    // Record trade in database
    if (tradeResult.success) {
      await recordTrade(supabase, {
        bot_id: bot.id,
        transaction_signature: tradeResult.signature || 'simulated',
        trade_type: tradeType,
        amount: tradeResult.amount,
        price: tradeResult.price
      });

      // Update bot statistics
      const newTotalTrades = (bot.total_trades || 0) + 1;
      const newTotalVolume = (bot.total_volume || 0) + (tradeResult.amount * tradeResult.price);

      await supabase
        .from('market_maker_bots')
        .update({
          total_trades: newTotalTrades,
          total_volume: newTotalVolume
        })
        .eq('id', bot.id);

      console.log(`Trade executed: ${tradeType} ${tradeResult.amount} ${bot.token_symbol} at $${tradeResult.price}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        trade: tradeResult,
        botStats: {
          totalTrades: (bot.total_trades || 0) + 1,
          totalVolume: (bot.total_volume || 0) + (tradeResult.amount * tradeResult.price),
          hoursRemaining
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Trade execution error:', error);
    throw error;
  }
}

async function getTokenMarketData(mintAddress: string) {
  try {
    // Get token price from Jupiter API (more reliable than Raydium for price data)
    const priceResponse = await fetch(`https://price.jup.ag/v4/price?ids=${mintAddress}`);
    const priceData = await priceResponse.json();
    
    const tokenPrice = priceData.data?.[mintAddress]?.price || 0.001;
    
    return {
      price: tokenPrice,
      liquidity: 10000, // Default liquidity estimate
      volume24h: 5000   // Default volume estimate
    };
  } catch (error) {
    console.error('Error getting market data:', error);
    return {
      price: 0.001,
      liquidity: 10000,
      volume24h: 5000
    };
  }
}

async function executeBuyTrade(bot: any, tradeSize: number, marketData: any, connection: Connection) {
  try {
    // Calculate trade parameters
    const basePrice = marketData.price;
    const priceVariation = (Math.random() - 0.5) * 0.1; // ±5% price variation
    const tradePrice = basePrice * (1 + priceVariation);
    const tokenAmount = tradeSize / tradePrice;

    // For simulation, we'll create a realistic trade record
    // In production, this would execute actual swaps via Raydium/Jupiter
    
    console.log(`Simulating BUY: ${tokenAmount.toFixed(6)} ${bot.token_symbol} at $${tradePrice.toFixed(6)}`);
    
    return {
      success: true,
      signature: `sim_buy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: tokenAmount,
      price: tradePrice,
      type: 'buy'
    };

  } catch (error) {
    console.error('Buy trade error:', error);
    return { success: false, error: error.message };
  }
}

async function executeSellTrade(bot: any, tradeSize: number, marketData: any, connection: Connection) {
  try {
    // Calculate trade parameters
    const basePrice = marketData.price;
    const priceVariation = (Math.random() - 0.5) * 0.1; // ±5% price variation
    const tradePrice = basePrice * (1 + priceVariation);
    const tokenAmount = tradeSize / tradePrice;

    console.log(`Simulating SELL: ${tokenAmount.toFixed(6)} ${bot.token_symbol} at $${tradePrice.toFixed(6)}`);
    
    return {
      success: true,
      signature: `sim_sell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: tokenAmount,
      price: tradePrice,
      type: 'sell'
    };

  } catch (error) {
    console.error('Sell trade error:', error);
    return { success: false, error: error.message };
  }
}

async function getLastTrade(supabase: any, botId: string) {
  const { data } = await supabase
    .from('market_maker_trades')
    .select('trade_type')
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  return data;
}

async function recordTrade(supabase: any, trade: any) {
  const { error } = await supabase
    .from('market_maker_trades')
    .insert(trade);
  
  if (error) {
    console.error('Error recording trade:', error);
    throw error;
  }
}

async function getMarketData(mintAddress: string) {
  try {
    const marketData = await getTokenMarketData(mintAddress);
    
    return new Response(
      JSON.stringify({ success: true, data: marketData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Failed to get market data: ${error.message}`);
  }
}
