
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AirdropCampaign {
  id: string;
  token_address: string;
  token_name: string;
  token_symbol: string;
  campaign_name: string;
  claim_site_url: string;
  quantity_per_wallet: number;
  total_amount_claimable: number;
  finish_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateCampaignData {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  campaignName: string;
  claimSiteUrl: string;
  quantityPerWallet: number;
  totalAmountClaimable: number;
  finishDate?: string;
  walletList: Array<{address: string, quantity: number}>;
}

export const useAirdrop = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createCampaign = async (data: CreateCampaignData) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('create-airdrop-campaign', {
        body: data
      });

      if (error) throw error;

      toast({
        title: "Campaign Created",
        description: `Airdrop campaign "${data.campaignName}" created successfully!`,
      });

      return result;
    } catch (error) {
      console.error('Campaign creation failed:', error);
      toast({
        title: "Campaign Failed",
        description: error.message || "Failed to create airdrop campaign",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getCampaigns = async (): Promise<AirdropCampaign[]> => {
    try {
      const { data, error } = await supabase
        .from('airdrop_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      return [];
    }
  };

  const getCampaignStats = async (campaignId: string) => {
    try {
      const { data: totalWallets, error: totalError } = await supabase
        .from('airdrop_wallet_lists')
        .select('id', { count: 'exact' })
        .eq('campaign_id', campaignId);

      const { data: claimedWallets, error: claimedError } = await supabase
        .from('airdrop_wallet_lists')
        .select('id', { count: 'exact' })
        .eq('campaign_id', campaignId)
        .eq('claimed', true);

      if (totalError || claimedError) throw totalError || claimedError;

      return {
        totalWallets: totalWallets?.length || 0,
        claimedWallets: claimedWallets?.length || 0,
        remainingWallets: (totalWallets?.length || 0) - (claimedWallets?.length || 0)
      };
    } catch (error) {
      console.error('Failed to get campaign stats:', error);
      return { totalWallets: 0, claimedWallets: 0, remainingWallets: 0 };
    }
  };

  const processClaim = async (claimSiteUrl: string, walletAddress: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-airdrop-claim', {
        body: { claimSiteUrl, walletAddress }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Claim processing failed:', error);
      throw error;
    }
  };

  return {
    isLoading,
    createCampaign,
    getCampaigns,
    getCampaignStats,
    processClaim
  };
};
