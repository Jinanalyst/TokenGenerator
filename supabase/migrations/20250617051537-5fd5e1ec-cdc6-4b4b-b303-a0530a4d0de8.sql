
-- Create airdrop campaigns table
CREATE TABLE public.airdrop_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  token_address TEXT NOT NULL,
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  claim_site_url TEXT UNIQUE NOT NULL,
  quantity_per_wallet DECIMAL NOT NULL DEFAULT 0,
  total_amount_claimable DECIMAL NOT NULL DEFAULT 0,
  finish_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create airdrop wallet list table
CREATE TABLE public.airdrop_wallet_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.airdrop_campaigns(id) ON DELETE CASCADE NOT NULL,
  wallet_address TEXT NOT NULL,
  quantity DECIMAL NOT NULL DEFAULT 0,
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create airdrop claims tracking table
CREATE TABLE public.airdrop_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.airdrop_campaigns(id) ON DELETE CASCADE NOT NULL,
  wallet_address TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  transaction_signature TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for airdrop campaigns
ALTER TABLE public.airdrop_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaigns"
  ON public.airdrop_campaigns
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns"
  ON public.airdrop_campaigns
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON public.airdrop_campaigns
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON public.airdrop_campaigns
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add RLS policies for wallet lists
ALTER TABLE public.airdrop_wallet_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wallet lists for their campaigns"
  ON public.airdrop_wallet_lists
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.airdrop_campaigns 
    WHERE id = campaign_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can manage wallet lists for their campaigns"
  ON public.airdrop_wallet_lists
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.airdrop_campaigns 
    WHERE id = campaign_id AND user_id = auth.uid()
  ));

-- Add RLS policies for claims (public read for claim site functionality)
ALTER TABLE public.airdrop_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view claims"
  ON public.airdrop_claims
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert claims"
  ON public.airdrop_claims
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_airdrop_campaigns_user_id ON public.airdrop_campaigns(user_id);
CREATE INDEX idx_airdrop_campaigns_claim_site_url ON public.airdrop_campaigns(claim_site_url);
CREATE INDEX idx_airdrop_wallet_lists_campaign_id ON public.airdrop_wallet_lists(campaign_id);
CREATE INDEX idx_airdrop_wallet_lists_wallet_address ON public.airdrop_wallet_lists(wallet_address);
CREATE INDEX idx_airdrop_claims_campaign_id ON public.airdrop_claims(campaign_id);
