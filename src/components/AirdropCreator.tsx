
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAirdrop } from '@/hooks/useAirdrop';
import { Loader2, Upload, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Token {
  id: string;
  name: string;
  symbol: string;
  mint_address: string;
  status: string;
  network: string;
}

interface AirdropCreatorProps {
  mainnetTokens: Token[];
}

const AirdropCreator: React.FC<AirdropCreatorProps> = ({ mainnetTokens }) => {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [walletList, setWalletList] = useState('');
  const [quantityPerWallet, setQuantityPerWallet] = useState('');
  const [finishDate, setFinishDate] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  
  const { createCampaign, isLoading } = useAirdrop();
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setWalletList(content);
      };
      reader.readAsText(file);
    }
  };

  const parseWalletList = (input: string): string[] => {
    return input
      .split(/[\n,]/)
      .map(wallet => wallet.trim())
      .filter(wallet => wallet.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedToken) {
      toast({
        title: "Token Required",
        description: "Please select a mainnet token to create an airdrop campaign",
        variant: "destructive"
      });
      return;
    }

    const wallets = parseWalletList(walletList);
    if (wallets.length === 0) {
      toast({
        title: "Wallet List Required",
        description: "Please provide a list of wallet addresses",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await createCampaign({
        tokenAddress: selectedToken.mint_address,
        tokenName: selectedToken.name,
        tokenSymbol: selectedToken.symbol,
        campaignName,
        walletList: wallets,
        quantityPerWallet: parseFloat(quantityPerWallet),
        finishDate: finishDate || undefined
      });

      setGeneratedUrl(result.claimUrl);
      
      // Reset form
      setCampaignName('');
      setWalletList('');
      setQuantityPerWallet('');
      setFinishDate('');
    } catch (error) {
      // Error handled in hook
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard",
    });
  };

  if (mainnetTokens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Airdrop Campaign</CardTitle>
          <CardDescription>
            You need to create a mainnet token first before creating airdrop campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please create and deploy a token to mainnet before setting up an airdrop campaign.
            Only verified mainnet tokens can be used for airdrops.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Airdrop Campaign</CardTitle>
          <CardDescription>
            Set up a token airdrop with custom claim site for your mainnet token
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="token">Select Token</Label>
              <select
                id="token"
                className="w-full p-2 border rounded-md"
                value={selectedToken?.id || ''}
                onChange={(e) => {
                  const token = mainnetTokens.find(t => t.id === e.target.value);
                  setSelectedToken(token || null);
                }}
                required
              >
                <option value="">Select a mainnet token</option>
                {mainnetTokens.map(token => (
                  <option key={token.id} value={token.id}>
                    {token.name} ({token.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="campaignName">Campaign Name</Label>
              <Input
                id="campaignName"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="My Token Airdrop"
                required
              />
            </div>

            <div>
              <Label htmlFor="quantity">Quantity per Wallet</Label>
              <Input
                id="quantity"
                type="number"
                step="0.000001"
                value={quantityPerWallet}
                onChange={(e) => setQuantityPerWallet(e.target.value)}
                placeholder="100"
                required
              />
            </div>

            <div>
              <Label htmlFor="finishDate">Finish Date (Optional)</Label>
              <Input
                id="finishDate"
                type="datetime-local"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="walletList">Wallet List</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="fileUpload"
                  />
                  <Label htmlFor="fileUpload" className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                      </span>
                    </Button>
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    Or paste wallet addresses below
                  </span>
                </div>
                <Textarea
                  id="walletList"
                  value={walletList}
                  onChange={(e) => setWalletList(e.target.value)}
                  placeholder="Enter wallet addresses (one per line or comma-separated)"
                  rows={6}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Total wallets: {parseWalletList(walletList).length}
                </p>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Airdrop Campaign
            </Button>
          </form>
        </CardContent>
      </Card>

      {generatedUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Created Successfully!</CardTitle>
            <CardDescription>
              Your airdrop claim site is ready. Share the URL below with your community.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input value={generatedUrl} readOnly />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generatedUrl)}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(generatedUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AirdropCreator;
