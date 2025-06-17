
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
    const { campaignId, transactionSignature } = await req.json();

    if (!campaignId || !transactionSignature) {
      throw new Error('Missing campaignId or transactionSignature');
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create Solana connection
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    // Verify transaction on blockchain
    console.log(`Verifying airdrop payment transaction: ${transactionSignature}`);
    
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

      // Update campaign with payment confirmation and activate it
      const { data: updatedCampaign, error: updateError } = await supabase
        .from('airdrop_campaigns')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update campaign: ${updateError.message}`);
      }

      console.log(`Airdrop payment verified and campaign ${campaignId} activated`);

      return new Response(
        JSON.stringify({
          success: true,
          campaign: updatedCampaign,
          message: 'Payment verified and airdrop campaign activated'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (verifyError) {
      console.error('Airdrop payment verification failed:', verifyError);
      
      // Mark campaign as inactive on failed payment
      await supabase
        .from('airdrop_campaigns')
        .update({ is_active: false })
        .eq('id', campaignId);

      throw new Error(`Payment verification failed: ${verifyError.message}`);
    }

  } catch (error) {
    console.error('Airdrop payment verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
