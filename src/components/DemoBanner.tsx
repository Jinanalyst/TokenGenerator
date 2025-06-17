
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Eye } from 'lucide-react';

interface DemoBannerProps {
  type: 'market-maker' | 'airdrop';
  className?: string;
}

const DemoBanner: React.FC<DemoBannerProps> = ({ type, className = '' }) => {
  const content = {
    'market-maker': {
      title: 'Market Maker Demo Mode',
      description: 'You are viewing a demo of the Market Maker Bot interface. All data shown is simulated for testing purposes. No real payments or trades will be processed.'
    },
    'airdrop': {
      title: 'Airdrop Site Maker Demo Mode', 
      description: 'You are viewing a demo of the Airdrop Site Maker. You can test all features without payments. Real campaigns require wallet connection and payment.'
    }
  };

  return (
    <Alert className={`bg-blue-500/10 border-blue-500/30 ${className}`}>
      <div className="flex items-center space-x-2">
        <Eye className="h-4 w-4 text-blue-400" />
        <Info className="h-4 w-4 text-blue-400" />
      </div>
      <AlertDescription className="text-blue-200 ml-6">
        <strong>{content[type].title}:</strong> {content[type].description}
      </AlertDescription>
    </Alert>
  );
};

export default DemoBanner;
