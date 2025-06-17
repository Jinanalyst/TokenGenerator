
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { claimSiteUrl, walletAddress } = await req.json()

    // Get campaign by claim site URL
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('airdrop_campaigns')
      .select('*')
      .eq('claim_site_url', claimSiteUrl)
      .eq('is_active', true)
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found or inactive')
    }

    // Check if campaign has expired
    if (campaign.finish_date && new Date() > new Date(campaign.finish_date)) {
      throw new Error('Campaign has expired')
    }

    // Check if wallet is eligible
    const { data: walletEntry, error: walletError } = await supabaseClient
      .from('airdrop_wallet_lists')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('wallet_address', walletAddress)
      .eq('claimed', false)
      .single()

    if (walletError || !walletEntry) {
      throw new Error('Wallet not eligible or already claimed')
    }

    // Check if already claimed
    const { data: existingClaim } = await supabaseClient
      .from('airdrop_claims')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('wallet_address', walletAddress)
      .single()

    if (existingClaim) {
      throw new Error('Already claimed')
    }

    // For now, we'll simulate the claim process
    // In a real implementation, this would involve creating and sending a Solana transaction
    const transactionSignature = `sim_${crypto.randomUUID()}`

    // Record the claim
    const { error: claimError } = await supabaseClient
      .from('airdrop_claims')
      .insert({
        campaign_id: campaign.id,
        wallet_address: walletAddress,
        quantity: walletEntry.quantity,
        transaction_signature: transactionSignature
      })

    if (claimError) throw claimError

    // Mark wallet as claimed
    const { error: updateError } = await supabaseClient
      .from('airdrop_wallet_lists')
      .update({ 
        claimed: true, 
        claimed_at: new Date().toISOString() 
      })
      .eq('id', walletEntry.id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionSignature,
        quantity: walletEntry.quantity,
        tokenSymbol: campaign.token_symbol
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
