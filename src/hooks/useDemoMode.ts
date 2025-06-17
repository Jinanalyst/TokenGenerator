
import { useState } from 'react';

export const useDemoMode = () => {
  const [isDemoMode, setIsDemoMode] = useState(true); // Default to demo mode for testing

  return {
    isDemoMode,
    setIsDemoMode,
    enableDemoMode: () => setIsDemoMode(true),
    disableDemoMode: () => setIsDemoMode(false)
  };
};

// Mock data generators
export const generateMockMarketMakerBot = () => ({
  id: 'demo-bot-1',
  user_id: 'demo-user',
  token_mint_address: '11111111111111111111111111111112',
  token_symbol: 'DEMO',
  token_name: 'Demo Token',
  package_size: 250,
  payment_amount: 0.15,
  payment_signature: 'demo_signature_123',
  status: 'active' as const,
  volume_target: 50000,
  price_min: 0.0001,
  price_max: 0.01,
  trade_frequency: 30,
  duration_hours: 48,
  start_time: new Date(Date.now() - 3600000).toISOString(), // Started 1 hour ago
  end_time: new Date(Date.now() + 172800000).toISOString(), // Ends in 47 hours
  total_trades: 142,
  total_volume: 28500,
  created_at: new Date(Date.now() - 7200000).toISOString(),
  updated_at: new Date(Date.now() - 1800000).toISOString()
});

export const generateMockTrades = () => [
  {
    id: 'trade-1',
    bot_id: 'demo-bot-1',
    transaction_signature: 'demo_tx_1',
    trade_type: 'buy' as const,
    amount: 1250,
    price: 0.0042,
    created_at: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: 'trade-2',
    bot_id: 'demo-bot-1',
    transaction_signature: 'demo_tx_2',
    trade_type: 'sell' as const,
    amount: 800,
    price: 0.0045,
    created_at: new Date(Date.now() - 600000).toISOString()
  },
  {
    id: 'trade-3',
    bot_id: 'demo-bot-1',
    transaction_signature: 'demo_tx_3',
    trade_type: 'buy' as const,
    amount: 2100,
    price: 0.0041,
    created_at: new Date(Date.now() - 900000).toISOString()
  }
];

export const generateMockMarketData = () => ({
  price: 0.004234,
  liquidity: 125000,
  volume24h: 89500
});

export const generateMockTradingStats = () => ({
  totalVolume: 28500,
  totalTrades: 142,
  averagePrice: 0.004185,
  hoursRemaining: 47.2,
  lastTradeTime: new Date(Date.now() - 300000).toISOString()
});

export const generateMockAirdropCampaign = () => ({
  id: 'demo-campaign-1',
  token_address: '11111111111111111111111111111112',
  token_name: 'Demo Token',
  token_symbol: 'DEMO',
  campaign_name: 'Demo Airdrop Campaign',
  claim_site_url: 'demo-token-airdrop-claim',
  quantity_per_wallet: 100,
  total_amount_claimable: 50000,
  finish_date: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
  is_active: true,
  created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
});
