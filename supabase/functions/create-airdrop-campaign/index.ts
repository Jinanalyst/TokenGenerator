
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

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { 
      tokenAddress, 
      tokenName, 
      tokenSymbol, 
      campaignName, 
      walletList, 
      quantityPerWallet,
      finishDate 
    } = await req.json()

    // Generate unique claim site URL
    const siteId = crypto.randomUUID().slice(0, 8)
    const claimSiteUrl = `${siteId}-claim`

    // Calculate total amount
    const totalAmount = walletList.length * quantityPerWallet

    // Create campaign
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('airdrop_campaigns')
      .insert({
        user_id: user.id,
        token_address: tokenAddress,
        token_name: tokenName,
        token_symbol: tokenSymbol,
        campaign_name: campaignName,
        claim_site_url: claimSiteUrl,
        quantity_per_wallet: quantityPerWallet,
        total_amount_claimable: totalAmount,
        finish_date: finishDate
      })
      .select()
      .single()

    if (campaignError) throw campaignError

    // Add wallet list
    const walletEntries = walletList.map((wallet: string) => ({
      campaign_id: campaign.id,
      wallet_address: wallet.trim(),
      quantity: quantityPerWallet
    }))

    const { error: walletError } = await supabaseClient
      .from('airdrop_wallet_lists')
      .insert(walletEntries)

    if (walletError) throw walletError

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaign,
        claimUrl: `${req.headers.get('origin')}/claim/${claimSiteUrl}`
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
