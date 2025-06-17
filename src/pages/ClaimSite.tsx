
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAirdrop } from '@/hooks/useAirdrop';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gift, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Campaign {
  id: string;
  token_name: string;
  token_symbol: string;
  campaign_name: string;
  quantity_per_wallet: number;
  finish_date?: string;
  is_active: boolean;
}

const ClaimSite = () => {
  const { claimId } = useParams<{ claimId: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [claimResult, setClaimResult] = useState<any>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  
  const { processClaim } = useAirdrop();
  const { toast } = useToast();

  useEffect(() => {
    if (claimId) {
      loadCampaign();
    }
  }, [claimId]);

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('airdrop_campaigns')
        .select('*')
        .eq('claim_site_url', claimId)
        .single();

      if (error || !data) {
        toast({
          title: "Campaign Not Found",
          description: "This airdrop campaign doesn't exist or has been removed",
          variant: "destructive"
        });
        return;
      }

      setCampaign(data);
    } catch (error) {
      console.error('Failed to load campaign:', error);
    } finally {
      setLoadingCampaign(false);
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress || !claimId) return;

    setIsLoading(true);
    try {
      const result = await processClaim(claimId, walletAddress);
      setClaimResult(result);
      setIsClaimed(true);
      
      toast({
        title: "Claim Successful!",
        description: `You've received ${result.quantity} ${result.tokenSymbol}`,
      });
    } catch (error) {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to process claim",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingCampaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Campaign Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              This airdrop campaign doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = campaign.finish_date && new Date() > new Date(campaign.finish_date);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="backdrop-blur-lg bg-white/10 border-white/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">
              {campaign.campaign_name}
            </CardTitle>
            <CardDescription className="text-purple-200">
              Claim your {campaign.token_name} ({campaign.token_symbol}) tokens
            </CardDescription>
            <div className="flex justify-center mt-2">
              <Badge variant={campaign.is_active && !isExpired ? "default" : "secondary"}>
                {isExpired ? "Expired" : campaign.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            {isClaimed ? (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
                <div className="text-white">
                  <h3 className="text-xl font-semibold mb-2">Claim Successful!</h3>
                  <p className="text-purple-200 mb-4">
                    You've received {claimResult.quantity} {claimResult.tokenSymbol}
                  </p>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-sm text-purple-200 mb-1">Transaction Signature:</p>
                    <p className="text-xs text-white font-mono break-all">
                      {claimResult.transactionSignature}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white/10 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-purple-200">Amount per wallet:</span>
                    <span className="text-white font-semibold">
                      {campaign.quantity_per_wallet} {campaign.token_symbol}
                    </span>
                  </div>
                  {campaign.finish_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-purple-200">Expires:</span>
                      <span className="text-white">
                        {new Date(campaign.finish_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {!campaign.is_active || isExpired ? (
                  <div className="text-center">
                    <p className="text-red-300">
                      {isExpired ? "This campaign has expired" : "This campaign is not active"}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleClaim} className="space-y-4">
                    <div>
                      <Input
                        type="text"
                        placeholder="Enter your Solana wallet address"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-purple-200"
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={isLoading || !walletAddress}
                      className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Claim Tokens
                    </Button>
                  </form>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClaimSite;
