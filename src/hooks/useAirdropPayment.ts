
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Transaction } from '@solana/web3.js';

export const useAirdropPayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const processAirdropPayment = async (campaignId: string, wallet: any) => {
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsProcessing(true);
    
    try {
      // Step 1: Create payment transaction
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'process-airdrop-payment',
        {
          body: {
            campaignId,
            walletPublicKey: wallet.publicKey.toString()
          }
        }
      );

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      // Step 2: Reconstruct and sign transaction
      const transactionArray = new Uint8Array(paymentData.transaction);
      const transaction = Transaction.from(transactionArray);

      console.log('Requesting wallet signature for airdrop payment...');
      
      const signedTransaction = await wallet.adapter.signTransaction(transaction);
      
      // Step 3: Send transaction to blockchain
      const { solana } = window as any;
      const signature = await solana.sendRawTransaction(signedTransaction.serialize());
      
      console.log('Airdrop payment transaction sent:', signature);
      
      // Step 4: Verify payment
      const { data: verificationData, error: verificationError } = await supabase.functions.invoke(
        'verify-airdrop-payment',
        {
          body: {
            campaignId,
            transactionSignature: signature
          }
        }
      );

      if (verificationError) {
        throw new Error(verificationError.message);
      }

      toast({
        title: "Payment Successful! 🎁",
        description: "Your airdrop campaign is now active and ready for claims",
      });

      return {
        success: true,
        signature,
        campaign: verificationData.campaign
      };

    } catch (error) {
      console.error('Airdrop payment processing failed:', error);
      
      let errorMessage = 'Payment processing failed';
      
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Payment was cancelled by user';
      } else if (error.message?.includes('Insufficient funds')) {
        errorMessage = 'Insufficient SOL balance for payment (0.02 SOL required)';
      } else if (error.message?.includes('verification failed')) {
        errorMessage = 'Payment verification failed - please contact support';
      }

      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });

      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processAirdropPayment,
    isProcessing
  };
};
