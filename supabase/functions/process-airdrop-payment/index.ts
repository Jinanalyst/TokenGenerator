
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction,
  LAMPORTS_PER_SOL
} from "https://esm.sh/@solana/web3.js@1.95.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, walletPublicKey } = await req.json();

    if (!campaignId || !walletPublicKey) {
      throw new Error('Missing campaignId or walletPublicKey');
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('airdrop_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Create Solana connection (mainnet for real payments)
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    // Fee recipient address (your mainnet address)
    const feeRecipient = new PublicKey('2zmewxtyL83t6WLkSPpQtdDiK5Nmd5KSn71HKC7TEGcU');
    const payerPublicKey = new PublicKey(walletPublicKey);

    // Fixed payment amount: 0.02 SOL
    const paymentLamports = Math.floor(0.02 * LAMPORTS_PER_SOL);

    // Create payment transaction
    const { blockhash } = await connection.getLatestBlockhash();
    
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: payerPublicKey,
    });

    // Add payment instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payerPublicKey,
        toPubkey: feeRecipient,
        lamports: paymentLamports,
      })
    );

    // Serialize transaction for signing
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    console.log(`Created airdrop payment transaction for campaign ${campaignId}, amount: 0.02 SOL`);

    return new Response(
      JSON.stringify({
        transaction: Array.from(serializedTransaction),
        message: 'Airdrop payment transaction created for 0.02 SOL'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Airdrop payment processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
