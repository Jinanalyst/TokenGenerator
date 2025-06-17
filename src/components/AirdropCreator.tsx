import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Upload, 
  Download, 
  FileText, 
  Calendar,
  Coins,
  Users,
  Link as LinkIcon,
  CheckCircle,
  Eye,
  Wallet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAirdrop } from '../hooks/useAirdrop';
import { usePaymentProcessor } from '../hooks/usePaymentProcessor';
import { useDemoMode } from '../hooks/useDemoMode';
import DemoBanner from './DemoBanner';

interface AirdropCreatorProps {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

const AirdropCreator: React.FC<AirdropCreatorProps> = ({
  tokenAddress,
  tokenName,
  tokenSymbol
}) => {
  const { toast } = useToast();
  const { createCampaign } = useAirdrop();
  const { processPayment, isProcessing } = usePaymentProcessor();
  const { isDemoMode, setIsDemoMode } = useDemoMode();
  
  const [campaignData, setCampaignData] = useState({
    campaignName: '',
    quantityPerWallet: '',
    finishDate: '',
    claimSiteUrl: ''
  });
  
  const [walletList, setWalletList] = useState<Array<{address: string, quantity: number}>>([]);
  const [csvContent, setCsvContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [wallet, setWallet] = useState<any>(isDemoMode ? { connected: true } : null);
  const [showSuccessState, setShowSuccessState] = useState(false);

  const AIRDROP_PRICE = 0.02; // 0.02 SOL

  const handleInputChange = (field: string, value: string) => {
    setCampaignData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-generate claim site URL from campaign name
    if (field === 'campaignName' && value) {
      const urlSlug = value.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setCampaignData(prev => ({
        ...prev,
        claimSiteUrl: `${tokenSymbol.toLowerCase()}-${urlSlug}-claim`
      }));
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      parseCsvContent(content);
    };
    reader.readAsText(file);
  };

  const parseCsvContent = (content: string) => {
    try {
      const lines = content.trim().split('\n');
      const parsed = lines.map(line => {
        const [address, quantity] = line.split(',');
        return {
          address: address.trim(),
          quantity: parseFloat(quantity?.trim() || campaignData.quantityPerWallet || '0')
        };
      }).filter(item => item.address && item.quantity > 0);
      
      setWalletList(parsed);
      toast({
        title: "CSV Uploaded Successfully",
        description: `Loaded ${parsed.length} wallet addresses`,
      });
    } catch (error) {
      toast({
        title: "CSV Parse Error",
        description: "Please check your CSV format (address,quantity per line)",
        variant: "destructive"
      });
    }
  };

  const handleTextareaInput = (content: string) => {
    setCsvContent(content);
    parseCsvContent(content);
  };

  const generateSampleCsv = () => {
    const sample = [
      'wallet_address,quantity',
      '11111111111111111111111111111112,100',
      '22222222222222222222222222222223,150',
      '33333333333333333333333333333334,200'
    ].join('\n');
    
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'airdrop_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculateTotalAmount = () => {
    return walletList.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleCreateCampaign = async () => {
    if (!campaignData.campaignName || !campaignData.claimSiteUrl || walletList.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields and upload wallet list",
        variant: "destructive"
      });
      return;
    }

    if (isDemoMode) {
      // Demo mode - simulate campaign creation
      setIsCreating(true);
      
      setTimeout(() => {
        toast({
          title: "Demo Airdrop Campaign Created! 🎁",
          description: `Demo campaign "${campaignData.campaignName}" created successfully! Claim site: /claim/${campaignData.claimSiteUrl}`,
        });
        setShowSuccessState(true);
        setIsCreating(false);
      }, 2000);
      return;
    }

    if (!wallet) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to create airdrop campaigns",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // First create a temporary campaign to get an ID for payment processing
      const tempCampaign = await createCampaign({
        tokenAddress,
        tokenName,
        tokenSymbol,
        campaignName: campaignData.campaignName,
        claimSiteUrl: campaignData.claimSiteUrl,
        quantityPerWallet: parseFloat(campaignData.quantityPerWallet) || 0,
        totalAmountClaimable: calculateTotalAmount(),
        finishDate: campaignData.finishDate ? new Date(campaignData.finishDate).toISOString() : undefined,
        walletList
      });

      // Process payment for airdrop creation (0.02 SOL)
      const paymentResult = await processAirdropPayment(tempCampaign.id, wallet);
      
      if (paymentResult.success) {
        toast({
          title: "Airdrop Campaign Created! 🎁",
          description: `Payment confirmed. Your airdrop site is now live at /claim/${campaignData.claimSiteUrl}`,
        });

        // Reset form
        setCampaignData({
          campaignName: '',
          quantityPerWallet: '',
          finishDate: '',
          claimSiteUrl: ''
        });
        setWalletList([]);
        setCsvContent('');
      }
      
    } catch (error) {
      console.error('Campaign creation failed:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create airdrop campaign. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const processAirdropPayment = async (campaignId: string, wallet: any) => {
    // This would be similar to the market maker payment processing
    // For now, we'll simulate it
    return {
      success: true,
      signature: `airdrop_${crypto.randomUUID()}`
    };
  };

  // Show success state in demo mode
  if (showSuccessState && isDemoMode) {
    return (
      <div className="space-y-6">
        <DemoBanner type="airdrop" />
        
        <Card className="bg-green-500/10 backdrop-blur-lg border-green-500/30 p-8">
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Demo Campaign Created Successfully!</h2>
            <p className="text-green-200">
              Your demo airdrop campaign "{campaignData.campaignName}" has been created.
            </p>
            <div className="bg-white/5 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-gray-300 mb-2">Demo Claim Site URL:</p>
              <p className="text-white font-mono text-sm break-all">
                {window.location.origin}/claim/{campaignData.claimSiteUrl}
              </p>
            </div>
            <div className="flex items-center justify-center space-x-4 pt-4">
              <Button 
                onClick={() => {
                  setShowSuccessState(false);
                  setCampaignData({
                    campaignName: '',
                    quantityPerWallet: '',
                    finishDate: '',
                    claimSiteUrl: ''
                  });
                  setWalletList([]);
                  setCsvContent('');
                }}
                variant="outline"
                className="border-green-300 text-green-300"
              >
                Create Another Campaign
              </Button>
              <Button
                onClick={() => window.open(`/claim/${campaignData.claimSiteUrl}`, '_blank')}
                className="bg-green-600 hover:bg-green-700"
              >
                View Claim Site
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Mode Controls */}
      <div className="flex items-center justify-between">
        <DemoBanner type="airdrop" className="flex-1" />
        <div className="flex items-center space-x-3 ml-4">
          <Label className="text-white text-sm">Demo Mode</Label>
          <Switch 
            checked={isDemoMode} 
            onCheckedChange={(checked) => {
              setIsDemoMode(checked);
              setWallet(checked ? { connected: true } : null);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Campaign Configuration */}
        <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <Coins className="w-6 h-6 text-yellow-400" />
            <span>Campaign Details</span>
          </h2>
          
          <div className="space-y-6">
            <div>
              <Label className="text-white font-semibold mb-2 block">Campaign Name</Label>
              <Input
                value={campaignData.campaignName}
                onChange={(e) => handleInputChange('campaignName', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                placeholder="My Token Airdrop"
              />
            </div>

            <div>
              <Label className="text-white font-semibold mb-2 block">Default Quantity per Wallet</Label>
              <Input
                type="number"
                value={campaignData.quantityPerWallet}
                onChange={(e) => handleInputChange('quantityPerWallet', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                placeholder="100"
              />
            </div>

            <div>
              <Label className="text-white font-semibold mb-2 block">Claim Site URL</Label>
              <div className="flex items-center space-x-2">
                <span className="text-purple-300 text-sm">/claim/</span>
                <Input
                  value={campaignData.claimSiteUrl}
                  onChange={(e) => handleInputChange('claimSiteUrl', e.target.value)}
                  className="bg-white/10 border-white/20 text-white flex-1"
                  placeholder="my-token-airdrop"
                />
              </div>
            </div>

            <div>
              <Label className="text-white font-semibold mb-2 block">End Date (Optional)</Label>
              <Input
                type="datetime-local"
                value={campaignData.finishDate}
                onChange={(e) => handleInputChange('finishDate', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
        </Card>

        {/* Wallet List Upload */}
        <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-400" />
            <span>Wallet List</span>
          </h2>
          
          <div className="space-y-6">
            <div>
              <Label className="text-white font-semibold mb-3 block">Upload CSV File</Label>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => document.getElementById('csv-upload')?.click()}
                  variant="outline"
                  className="border-blue-300 text-blue-300 hover:bg-blue-300 hover:text-blue-900"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV
                </Button>
                <Button
                  onClick={generateSampleCsv}
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Sample CSV
                </Button>
              </div>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </div>

            <div>
              <Label className="text-white font-semibold mb-2 block">Or Paste CSV Content</Label>
              <Textarea
                value={csvContent}
                onChange={(e) => handleTextareaInput(e.target.value)}
                className="bg-white/10 border-white/20 text-white h-32"
                placeholder="wallet_address,quantity&#10;11111111111111111111111111111112,100&#10;22222222222222222222222222222223,150"
              />
            </div>

            {walletList.length > 0 && (
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 font-semibold">Wallet List Loaded</span>
                </div>
                <p className="text-green-200 text-sm">
                  <strong>{walletList.length}</strong> wallets loaded
                </p>
                <p className="text-green-200 text-sm">
                  <strong>{calculateTotalAmount().toLocaleString()}</strong> total tokens to distribute
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Pricing & Launch */}
        <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6 lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pricing */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span>Pricing</span>
              </h3>
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-6 border border-yellow-500/30">
                <div className="text-center">
                  <p className="text-yellow-300 text-sm mb-2">Airdrop Site Creation</p>
                  <p className="text-4xl font-bold text-white mb-2">
                    {isDemoMode ? '0.00' : AIRDROP_PRICE} SOL
                  </p>
                  <p className="text-yellow-200 text-sm">
                    {isDemoMode ? 'Demo - No Payment Required' : 'One-time payment for unlimited claims'}
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Included Features</span>
              </h3>
              <ul className="text-purple-200 text-sm space-y-2">
                <li className="flex items-center space-x-2">
                  <LinkIcon className="w-3 h-3 text-blue-400" />
                  <span>Custom claim site URL</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Users className="w-3 h-3 text-green-400" />
                  <span>Unlimited wallet addresses</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Calendar className="w-3 h-3 text-purple-400" />
                  <span>Optional expiration dates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <FileText className="w-3 h-3 text-orange-400" />
                  <span>Real-time claim tracking</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Launch Button */}
          <div className="mt-8">
            <Button
              onClick={handleCreateCampaign}
              disabled={isCreating || (!isDemoMode && (isProcessing || !wallet)) || walletList.length === 0}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-4 text-lg font-semibold"
            >
              {isCreating || isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{isProcessing ? 'Processing Payment...' : 'Creating Campaign...'}</span>
                </div>
              ) : isDemoMode ? (
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>Create Demo Airdrop Site</span>
                </div>
              ) : !wallet ? (
                <div className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5" />
                  <span>Connect Wallet to Continue</span>
                </div>
              ) : walletList.length === 0 ? (
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Upload Wallet List First</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Coins className="w-5 h-5" />
                  <span>Create Airdrop Site (Pay {AIRDROP_PRICE} SOL)</span>
                </div>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AirdropCreator;
