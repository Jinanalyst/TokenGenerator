
-- Create market_maker_bots table to store bot configurations and status
CREATE TABLE public.market_maker_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_mint_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT NOT NULL,
  package_size INTEGER NOT NULL DEFAULT 100,
  payment_amount DECIMAL(10,6) NOT NULL,
  payment_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, paused, stopped, completed
  volume_target BIGINT DEFAULT 10000,
  price_min DECIMAL(20,10),
  price_max DECIMAL(20,10),
  trade_frequency INTEGER DEFAULT 60, -- seconds between trades
  duration_hours INTEGER NOT NULL DEFAULT 24,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  total_trades INTEGER DEFAULT 0,
  total_volume DECIMAL(20,6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create market_maker_trades table to track individual bot trades
CREATE TABLE public.market_maker_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID REFERENCES public.market_maker_bots(id) NOT NULL,
  transaction_signature TEXT NOT NULL,
  trade_type TEXT NOT NULL, -- buy, sell
  amount DECIMAL(20,6) NOT NULL,
  price DECIMAL(20,10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.market_maker_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_maker_trades ENABLE ROW LEVEL SECURITY;

-- RLS policies for market_maker_bots
CREATE POLICY "Users can view their own market maker bots" 
  ON public.market_maker_bots 
  FOR SELECT 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own market maker bots" 
  ON public.market_maker_bots 
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own market maker bots" 
  ON public.market_maker_bots 
  FOR UPDATE 
  USING (auth.uid()::text = user_id);

-- RLS policies for market_maker_trades
CREATE POLICY "Users can view trades for their bots" 
  ON public.market_maker_trades 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.market_maker_bots 
    WHERE id = market_maker_trades.bot_id 
    AND user_id = auth.uid()::text
  ));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_market_maker_bots_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_market_maker_bots_updated_at
  BEFORE UPDATE ON public.market_maker_bots
  FOR EACH ROW EXECUTE FUNCTION public.update_market_maker_bots_updated_at();
