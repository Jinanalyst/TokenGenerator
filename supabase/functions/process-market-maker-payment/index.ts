
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
    const { botId, walletPublicKey } = await req.json();

    if (!botId || !walletPublicKey) {
      throw new Error('Missing botId or walletPublicKey');
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get bot details
    const { data: bot, error: botError } = await supabase
      .from('market_maker_bots')
      .select('*')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      throw new Error('Bot not found');
    }

    // Create Solana connection (mainnet for real payments)
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    // Fee recipient address
    const feeRecipient = new PublicKey('2zmewxtyL83t6WLkSPpQtdDiK5Nmd5KSn71HKC7TEGcU');
    const payerPublicKey = new PublicKey(walletPublicKey);

    // Convert payment amount to lamports
    const paymentLamports = Math.floor(Number(bot.payment_amount) * LAMPORTS_PER_SOL);

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

    console.log(`Created payment transaction for bot ${botId}, amount: ${bot.payment_amount} SOL`);

    return new Response(
      JSON.stringify({
        transaction: Array.from(serializedTransaction),
        message: `Payment transaction created for ${bot.payment_amount} SOL`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
