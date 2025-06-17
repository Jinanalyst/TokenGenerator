import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Coins, 
  Globe, 
  Hash, 
  Users, 
  Zap, 
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Shield,
  Lock,
  Droplets,
  Edit3,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSolana } from '../hooks/useSolana';
import { Link } from 'react-router-dom';
import { 
  validateTokenName, 
  validateTokenSymbol, 
  validateTokenSupply, 
  validateDecimals,
  validateImageFile,
  sanitizeString 
} from '../utils/inputValidation';
import { createUserFriendlyError } from '../utils/errorHandling';
import { openSecureUrl } from '../utils/urlSecurity';

interface TokenCreationPanelProps {
  tokenData: {
    name?: string;
    symbol?: string;
    supply?: number;
    decimals?: number;
    network?: string;
    revokeMintAuthority?: boolean;
    revokeFreezeAuthority?: boolean;
    revokeUpdateAuthority?: boolean;
    image?: string;
  };
  wallet?: any;
  onTokenDataChange?: (data: any) => void;
}

const TokenCreationPanel: React.FC<TokenCreationPanelProps> = ({ 
  tokenData, 
  wallet, 
  onTokenDataChange 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [tokenResult, setTokenResult] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Local editable state
  const [editableData, setEditableData] = useState({
    name: tokenData.name || '',
    symbol: tokenData.symbol || '',
    supply: tokenData.supply || 1000000,
    decimals: tokenData.decimals || 9,
    network: tokenData.network || 'devnet',
    revokeMintAuthority: tokenData.revokeMintAuthority || false,
    revokeFreezeAuthority: tokenData.revokeFreezeAuthority || false,
    revokeUpdateAuthority: tokenData.revokeUpdateAuthority || false,
    image: tokenData.image || '',
  });
  
  const { toast } = useToast();
  const solana = useSolana(editableData.network as 'mainnet' | 'devnet');

  // Update local state when tokenData changes
  useEffect(() => {
    setEditableData({
      name: tokenData.name || '',
      symbol: tokenData.symbol || '',
      supply: tokenData.supply || 1000000,
      decimals: tokenData.decimals || 9,
      network: tokenData.network || 'devnet',
      revokeMintAuthority: tokenData.revokeMintAuthority || false,
      revokeFreezeAuthority: tokenData.revokeFreezeAuthority || false,
      revokeUpdateAuthority: tokenData.revokeUpdateAuthority || false,
      image: tokenData.image || '',
    });
    setImagePreview(tokenData.image || null);
  }, [tokenData]);

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'name':
        const nameValidation = validateTokenName(value);
        return nameValidation.isValid ? null : nameValidation.error!;
      case 'symbol':
        const symbolValidation = validateTokenSymbol(value);
        return symbolValidation.isValid ? null : symbolValidation.error!;
      case 'supply':
        const supplyValidation = validateTokenSupply(value);
        return supplyValidation.isValid ? null : supplyValidation.error!;
      case 'decimals':
        const decimalsValidation = validateDecimals(value);
        return decimalsValidation.isValid ? null : decimalsValidation.error!;
      default:
        return null;
    }
  };

  const handleInputChange = (field: string, value: any) => {
    // Sanitize string inputs
    const sanitizedValue = typeof value === 'string' ? sanitizeString(value) : value;
    
    // Validate the field
    const error = validateField(field, sanitizedValue);
    setValidationErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));

    const updatedData = { ...editableData, [field]: sanitizedValue };
    setEditableData(updatedData);
    
    if (onTokenDataChange) {
      onTokenDataChange(updatedData);
    }
  };

  const handleCheckboxChange = (field: string, checked: boolean) => {
    const updatedData = { ...editableData, [field]: checked };
    setEditableData(updatedData);
    
    if (onTokenDataChange) {
      onTokenDataChange(updatedData);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Secure file validation
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setImagePreview(imageUrl);
      handleInputChange('image', imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateToken = async () => {
    if (!wallet || !wallet.publicKey) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to create tokens",
        variant: "destructive"
      });
      return;
    }

    // Validate all fields before proceeding
    const errors: {[key: string]: string} = {};
    const nameError = validateField('name', editableData.name);
    const symbolError = validateField('symbol', editableData.symbol);
    const supplyError = validateField('supply', editableData.supply);
    const decimalsError = validateField('decimals', editableData.decimals);

    if (nameError) errors.name = nameError;
    if (symbolError) errors.symbol = symbolError;
    if (supplyError) errors.supply = supplyError;
    if (decimalsError) errors.decimals = decimalsError;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before creating the token",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      console.log('Creating real token with validated data:', editableData);

      // Create the token using SolanaService with real wallet
      const metadata = {
        name: editableData.name,
        symbol: editableData.symbol,
        decimals: editableData.decimals,
        supply: editableData.supply,
        image: editableData.image,
        revokeMintAuthority: editableData.revokeMintAuthority,
        revokeFreezeAuthority: editableData.revokeFreezeAuthority,
        revokeUpdateAuthority: editableData.revokeUpdateAuthority
      };

      const result = await solana.createToken(metadata, wallet);
      
      if (result) {
        setTokenResult(result);
        setIsCreated(true);
        
        toast({
          title: "Token Created Successfully! 🎉",
          description: `Your ${editableData.symbol} token is now live on Solana ${editableData.network}!`,
        });
      }
    } catch (error) {
      console.error('Token creation failed:', error);
      const userFriendlyError = createUserFriendlyError(error, 'token_creation');
      toast({
        title: "Creation Failed",
        description: userFriendlyError,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  const handleExternalLink = (url: string, confirmMessage?: string) => {
    const success = openSecureUrl(url, confirmMessage);
    if (!success) {
      toast({
        title: "Blocked",
        description: "This link has been blocked for security reasons",
        variant: "destructive"
      });
    }
  };

  const getNetworkConfig = () => {
    if (editableData.network === 'mainnet') {
      return {
        name: 'Mainnet Beta',
        rpc: 'https://api.mainnet-beta.solana.com',
        explorer: 'https://explorer.solana.com',
        color: 'from-green-500 to-emerald-500'
      };
    }
    return {
      name: 'Devnet',
      rpc: 'https://api.devnet.solana.com',
      explorer: 'https://explorer.solana.com/?cluster=devnet',
      color: 'from-orange-500 to-yellow-500'
    };
  };

  const networkConfig = getNetworkConfig();

  return (
    <Card className="bg-black/20 backdrop-blur-lg border-purple-500/30 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Coins className="w-6 h-6 text-purple-400" />
            <span>Token Creation Panel</span>
          </h2>
          <div className="flex items-center space-x-3">
            <Badge className={`bg-gradient-to-r ${networkConfig.color} text-white`}>
              {networkConfig.name}
            </Badge>
            {!isCreated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-purple-300 hover:text-purple-200"
              >
                <Edit3 className="w-4 h-4 mr-1" />
                {isEditing ? 'View' : 'Edit'}
              </Button>
            )}
          </div>
        </div>

        {/* Fee Information */}
        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <Coins className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 font-semibold">Token Creation Fee</span>
          </div>
          <p className="text-blue-100">
            Creating a token costs <strong>0.02 SOL</strong> + network fees
          </p>
          <p className="text-blue-200 text-sm mt-1">
            This fee supports the platform and ensures quality token creation
          </p>
        </div>

        {/* Token Logo Section */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center space-x-2 mb-3">
            <ImageIcon className="w-4 h-4 text-pink-400" />
            <span className="text-pink-200 text-sm">Token Logo</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Image Preview */}
            <div className="w-20 h-20 bg-white/10 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Token logo preview" 
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-white/40" />
              )}
            </div>
            
            {/* Upload Button */}
            {(isEditing || !editableData.image) && (
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="token-image-upload"
                />
                <label
                  htmlFor="token-image-upload"
                  className="cursor-pointer inline-flex items-center space-x-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 px-4 py-2 rounded-lg border border-purple-500/30 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Logo</span>
                </label>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, GIF up to 2MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Token Details with Validation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <Hash className="w-4 h-4 text-purple-400" />
                <span className="text-purple-200 text-sm">Token Name</span>
              </div>
              {isEditing ? (
                <div>
                  <Input
                    value={editableData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter token name"
                    className={`bg-white/10 border-white/20 text-white ${validationErrors.name ? 'border-red-400' : ''}`}
                  />
                  {validationErrors.name && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.name}</p>
                  )}
                </div>
              ) : (
                <p className="text-white font-semibold">{editableData.name || 'Unnamed Token'}</p>
              )}
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-blue-200 text-sm">Symbol</span>
              </div>
              {isEditing ? (
                <div>
                  <Input
                    value={editableData.symbol}
                    onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                    placeholder="Enter symbol (e.g., TOKEN)"
                    maxLength={10}
                    className={`bg-white/10 border-white/20 text-white ${validationErrors.symbol ? 'border-red-400' : ''}`}
                  />
                  {validationErrors.symbol && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.symbol}</p>
                  )}
                </div>
              ) : (
                <p className="text-white font-semibold">{editableData.symbol || 'TOKEN'}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-green-400" />
                <span className="text-green-200 text-sm">Total Supply</span>
              </div>
              {isEditing ? (
                <div>
                  <Input
                    type="number"
                    value={editableData.supply}
                    onChange={(e) => handleInputChange('supply', parseInt(e.target.value) || 0)}
                    placeholder="Enter total supply"
                    className={`bg-white/10 border-white/20 text-white ${validationErrors.supply ? 'border-red-400' : ''}`}
                  />
                  {validationErrors.supply && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.supply}</p>
                  )}
                </div>
              ) : (
                <p className="text-white font-semibold">
                  {editableData.supply.toLocaleString()}
                </p>
              )}
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-200 text-sm">Decimals</span>
              </div>
              {isEditing ? (
                <div>
                  <Input
                    type="number"
                    value={editableData.decimals}
                    onChange={(e) => handleInputChange('decimals', parseInt(e.target.value) || 0)}
                    min="0"
                    max="18"
                    className={`bg-white/10 border-white/20 text-white ${validationErrors.decimals ? 'border-red-400' : ''}`}
                  />
                  {validationErrors.decimals && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.decimals}</p>
                  )}
                </div>
              ) : (
                <p className="text-white font-semibold">{editableData.decimals}</p>
              )}
            </div>
          </div>
        </div>

        {/* Network Selection */}
        {isEditing && !isCreated && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <Label className="text-white font-semibold mb-3 block">Network</Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="devnet"
                  name="network"
                  checked={editableData.network === 'devnet'}
                  onChange={() => handleInputChange('network', 'devnet')}
                  className="text-orange-500"
                />
                <label htmlFor="devnet" className="text-orange-200 cursor-pointer">Devnet (Testing)</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="mainnet"
                  name="network"
                  checked={editableData.network === 'mainnet'}
                  onChange={() => handleInputChange('network', 'mainnet')}
                  className="text-green-500"
                />
                <label htmlFor="mainnet" className="text-green-200 cursor-pointer">Mainnet (Real SOL)</label>
              </div>
            </div>
          </div>
        )}

        {/* Authority Controls */}
        {!isCreated && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-yellow-400" />
              <span>Authority Settings</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={editableData.revokeMintAuthority}
                  onCheckedChange={(checked) => handleCheckboxChange('revokeMintAuthority', checked === true)}
                  id="revoke-mint"
                />
                <label htmlFor="revoke-mint" className="text-sm text-gray-300 cursor-pointer">
                  Revoke Mint Authority (Prevents creating more tokens)
                  {editableData.revokeMintAuthority && <span className="text-green-400 ml-2">✓ Will be revoked</span>}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={editableData.revokeFreezeAuthority}
                  onCheckedChange={(checked) => handleCheckboxChange('revokeFreezeAuthority', checked === true)}
                  id="revoke-freeze"
                />
                <label htmlFor="revoke-freeze" className="text-sm text-gray-300 cursor-pointer">
                  Revoke Freeze Authority (Prevents freezing token accounts)
                  {editableData.revokeFreezeAuthority && <span className="text-green-400 ml-2">✓ Will be revoked</span>}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={editableData.revokeUpdateAuthority}
                  onCheckedChange={(checked) => handleCheckboxChange('revokeUpdateAuthority', checked === true)}
                  id="revoke-update"
                />
                <label htmlFor="revoke-update" className="text-sm text-gray-300 cursor-pointer">
                  Revoke Update Authority (Makes metadata immutable)
                  {editableData.revokeUpdateAuthority && <span className="text-green-400 ml-2">✓ Will be revoked</span>}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Token Result (if created) with secure external links */}
        {isCreated && tokenResult && (
          <div className="space-y-4">
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-300 font-semibold">Mint Address</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(tokenResult.mintAddress)}
                  className="text-green-300 hover:text-green-200"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-green-100 font-mono text-sm break-all">{tokenResult.mintAddress}</p>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
              <div className="flex items-center space-x-2 mb-2">
                <ExternalLink className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300 font-semibold">DEXScreener Listing</span>
              </div>
              <p className="text-blue-200 text-sm">
                Your token will appear on DEXScreener automatically once it has trading activity and liquidity pools. 
                Create a liquidity pool to enable trading!
              </p>
            </div>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
              <Button
                variant="outline"
                onClick={() => handleExternalLink(tokenResult.explorerUrl, "Open Solana Explorer?")}
                className="text-white border-white/20 hover:bg-white/10"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Explorer
              </Button>
              
              <Link to="/liquidity-pool">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white w-full sm:w-auto">
                  <Droplets className="w-4 h-4 mr-2" />
                  Create Liquidity Pool
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!isCreated && (
          <div className="flex justify-center">
            <Button
              onClick={handleCreateToken}
              disabled={isCreating || !wallet}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-3 text-lg font-semibold"
            >
              {isCreating ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Token...</span>
                </div>
              ) : !wallet ? (
                <div className="flex items-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>Connect Wallet to Create</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Create Token (0.02 SOL)</span>
                </div>
              )}
            </Button>
          </div>
        )}

        {isCreated && (
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-green-400">
              <CheckCircle className="w-6 h-6" />
              <span className="text-xl font-semibold">Token Created Successfully!</span>
            </div>
            <p className="text-green-300">Your token is now live on Solana {networkConfig.name}</p>
          </div>
        )}

        {/* Enhanced Security Disclaimer */}
        <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/30">
          <div className="flex items-start space-x-2">
            <Shield className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="text-orange-200 text-sm">
              <strong>Security Notice:</strong> This interface creates actual Solana tokens with real value. 
              All inputs are validated and sanitized for security. Rate limiting is in effect to prevent abuse.
              Always verify transaction details before confirming. Revoked authorities cannot be restored!
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TokenCreationPanel;
