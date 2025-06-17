
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAirdrop, type AirdropCampaign } from '@/hooks/useAirdrop';
import { Copy, ExternalLink, Calendar, Users, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AirdropDashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<AirdropCampaign[]>([]);
  const [campaignStats, setCampaignStats] = useState<Record<string, any>>({});
  const { getCampaigns, getCampaignStats } = useAirdrop();
  const { toast } = useToast();

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    const campaignData = await getCampaigns();
    setCampaigns(campaignData);

    // Load stats for each campaign
    const stats: Record<string, any> = {};
    for (const campaign of campaignData) {
      stats[campaign.id] = await getCampaignStats(campaign.id);
    }
    setCampaignStats(stats);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard",
    });
  };

  const getClaimUrl = (claimSiteUrl: string) => {
    return `${window.location.origin}/claim/${claimSiteUrl}`;
  };

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Airdrop Campaigns</CardTitle>
          <CardDescription>
            No airdrop campaigns created yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Create your first airdrop campaign to start distributing tokens to your community.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Airdrop Campaigns</h2>
        <p className="text-muted-foreground">
          Manage your token distribution campaigns
        </p>
      </div>

      <div className="grid gap-6">
        {campaigns.map((campaign) => {
          const stats = campaignStats[campaign.id] || { totalWallets: 0, claimedWallets: 0, remainingWallets: 0 };
          const claimUrl = getClaimUrl(campaign.claim_site_url);
          const isExpired = campaign.finish_date && new Date() > new Date(campaign.finish_date);
          
          return (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {campaign.campaign_name}
                      <Badge variant={campaign.is_active && !isExpired ? "default" : "secondary"}>
                        {isExpired ? "Expired" : campaign.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {campaign.token_name} ({campaign.token_symbol})
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Wallets</p>
                      <p className="font-semibold">{stats.totalWallets}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Claimed</p>
                      <p className="font-semibold">{stats.claimedWallets}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining</p>
                      <p className="font-semibold">{stats.remainingWallets}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Quantity per wallet:</span>
                    <span className="font-medium">{campaign.quantity_per_wallet} {campaign.token_symbol}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Total claimable:</span>
                    <span className="font-medium">{campaign.total_amount_claimable} {campaign.token_symbol}</span>
                  </div>
                  {campaign.finish_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Expires:</span>
                      <span className="font-medium">
                        {new Date(campaign.finish_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Claim Site URL:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={claimUrl}
                      readOnly
                      className="flex-1 p-2 text-sm bg-gray-50 border rounded"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(claimUrl)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(claimUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AirdropDashboard;
