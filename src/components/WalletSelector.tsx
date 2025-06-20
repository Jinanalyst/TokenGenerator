import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const WalletSelector: React.FC = () => {
  return (
    <div className="flex justify-center">
      <WalletMultiButton />
    </div>
  );
};

export default WalletSelector;
