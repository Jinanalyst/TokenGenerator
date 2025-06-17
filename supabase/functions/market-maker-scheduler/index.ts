
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Market Maker Scheduler running at:', new Date().toISOString());

    // Get all active bots
    const { data: activeBots, error } = await supabase
      .from('market_maker_bots')
      .select('*')
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to fetch active bots: ${error.message}`);
    }

    console.log(`Found ${activeBots?.length || 0} active bots`);

    const results = [];

    // Process each active bot
    for (const bot of activeBots || []) {
      try {
        // Check if bot should still be running
        const now = new Date();
        const startTime = new Date(bot.start_time);
        const hoursRunning = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        if (hoursRunning >= bot.duration_hours) {
          // Mark bot as completed
          await supabase
            .from('market_maker_bots')
            .update({ 
              status: 'completed',
              end_time: now.toISOString()
            })
            .eq('id', bot.id);

          console.log(`Bot ${bot.id} completed after ${hoursRunning.toFixed(2)} hours`);
          results.push({ botId: bot.id, status: 'completed' });
          continue;
        }

        // Calculate if it's time for next trade based on frequency
        const { data: lastTrade } = await supabase
          .from('market_maker_trades')
          .select('created_at')
          .eq('bot_id', bot.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const timeSinceLastTrade = lastTrade 
          ? (now.getTime() - new Date(lastTrade.created_at).getTime()) / (1000 * 60)
          : bot.trade_frequency;

        if (timeSinceLastTrade >= (bot.trade_frequency || 60)) {
          // Execute trade for this bot
          console.log(`Triggering trade for bot ${bot.id} - ${bot.token_symbol}`);
          
          const tradeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/market-maker-engine`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              botId: bot.id,
              action: 'execute_trades'
            })
          });

          const tradeResult = await tradeResponse.json();
          results.push({ 
            botId: bot.id, 
            status: 'trade_executed',
            result: tradeResult 
          });

        } else {
          results.push({ 
            botId: bot.id, 
            status: 'waiting',
            nextTradeIn: (bot.trade_frequency || 60) - timeSinceLastTrade
          });
        }

      } catch (botError) {
        console.error(`Error processing bot ${bot.id}:`, botError);
        results.push({ 
          botId: bot.id, 
          status: 'error',
          error: botError.message 
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedAt: new Date().toISOString(),
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Scheduler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
