
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Connection } from "https://esm.sh/@solana/web3.js@1.95.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { botId, transactionSignature } = await req.json();

    if (!botId || !transactionSignature) {
      throw new Error('Missing botId or transactionSignature');
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create Solana connection
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    // Verify transaction on blockchain
    console.log(`Verifying transaction: ${transactionSignature}`);
    
    try {
      const transaction = await connection.getTransaction(transactionSignature, {
        commitment: 'confirmed'
      });

      if (!transaction) {
        throw new Error('Transaction not found on blockchain');
      }

      if (transaction.meta?.err) {
        throw new Error('Transaction failed on blockchain');
      }

      // Update bot with payment confirmation
      const { data: updatedBot, error: updateError } = await supabase
        .from('market_maker_bots')
        .update({
          payment_signature: transactionSignature,
          status: 'active',
          start_time: new Date().toISOString()
        })
        .eq('id', botId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update bot: ${updateError.message}`);
      }

      console.log(`Payment verified and bot ${botId} activated`);

      return new Response(
        JSON.stringify({
          success: true,
          bot: updatedBot,
          message: 'Payment verified and bot activated'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (verifyError) {
      console.error('Transaction verification failed:', verifyError);
      
      // Update bot status to failed
      await supabase
        .from('market_maker_bots')
        .update({ status: 'stopped' })
        .eq('id', botId);

      throw new Error(`Payment verification failed: ${verifyError.message}`);
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
