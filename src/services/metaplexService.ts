
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { IPFSService } from './ipfsService';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  createV1,
  CreateV1InstructionAccounts,
  CreateV1InstructionArgs,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { some, none } from '@metaplex-foundation/umi/serializers';
import { generateSigner, publicKey, createSignerFromKeypair } from '@metaplex-foundation/umi';

export class MetaplexService {
  private connection: Connection;
  private umi: any;

  constructor(connection: Connection, wallet?: any) {
    this.connection = connection;
    this.umi = createUmi(connection.rpcEndpoint);
    if (wallet) {
      this.setWallet(wallet);
    }
  }

  setWallet(wallet: any) {
    try {
      console.log('Setting wallet in Metaplex service...');
      if (wallet && (wallet.publicKey || wallet.adapter?.publicKey)) {
        this.umi.use(walletAdapterIdentity(wallet));
        console.log('Wallet set successfully in Metaplex');
      }
    } catch (error) {
      console.error('Failed to set wallet in Metaplex:', error);
    }
  }

  async uploadAndCreateMetadata(
    tokenName: string,
    tokenSymbol: string,
    description: string,
    imageFile: Blob,
    mintPublicKey: PublicKey,
    payerPublicKey: PublicKey
  ): Promise<{ metadataUri: string; success: boolean; error?: string }> {
    try {
      console.log('Starting metadata creation process...');
      
      // Step 1: Upload image to IPFS
      console.log('Uploading image to IPFS...');
      const imageUrl = await IPFSService.uploadImageToIPFS(imageFile, `${tokenSymbol.toLowerCase()}_logo.png`);
      console.log('Image uploaded:', imageUrl);

      // Step 2: Create and upload metadata
      console.log('Creating token metadata...');
      const tokenMetadata = await IPFSService.createTokenMetadata(tokenName, tokenSymbol, description, imageUrl);
      console.log('Uploading metadata to IPFS...');
      const metadataUri = await IPFSService.uploadMetadataToIPFS(tokenMetadata);
      console.log('Metadata uploaded:', metadataUri);

      // Validate the metadata URI
      if (!IPFSService.validateIPFSUrl(metadataUri) && !metadataUri.startsWith('blob:')) {
        throw new Error('Invalid metadata URI generated');
      }

      return {
        metadataUri,
        success: true
      };
    } catch (error) {
      console.error('Metadata creation failed:', error);
      return {
        metadataUri: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown metadata error'
      };
    }
  }

  async createMetadataAccount(
    mintPublicKey: PublicKey,
    metadataUri: string,
    tokenName: string,
    tokenSymbol: string,
    payerPublicKey: PublicKey
  ): Promise<{ transaction: Transaction; success: boolean; error?: string }> {
    try {
      console.log('Creating metadata account transaction...');
      
      // Ensure wallet is properly set
      if (!this.umi.identity) {
        throw new Error('Wallet not properly connected to Metaplex UMI');
      }

      const mint = publicKey(mintPublicKey.toString());
      const updateAuthority = publicKey(payerPublicKey.toString());

      const accounts: CreateV1InstructionAccounts = {
        mint,
        authority: this.umi.identity,
        payer: this.umi.identity,
        updateAuthority: updateAuthority,
      };
      
      const data: CreateV1InstructionArgs = {
        name: tokenName,
        symbol: tokenSymbol,
        uri: metadataUri,
        sellerFeeBasisPoints: 0,
        creators: some([{ 
          address: this.umi.identity.publicKey, 
          verified: true, 
          share: 100 
        }]),
        primarySaleHappened: false,
        isMutable: true,
        tokenStandard: TokenStandard.Fungible,
        collection: none(),
        uses: none(),
        collectionDetails: none(),
        ruleSet: none(),
      };

      console.log('Creating metadata instruction...');
      const instruction = createV1(this.umi, {
        ...accounts,
        ...data,
      });

      // Convert UMI instruction to web3.js transaction
      const umiInstructions = instruction.getInstructions();
      if (umiInstructions.length === 0) {
        throw new Error('No instructions generated for metadata creation');
      }

      const transaction = new Transaction();
      
      // Add the metadata creation instruction
      const metadataInstruction = umiInstructions[0];
      transaction.add({
        keys: metadataInstruction.keys.map(key => ({
          pubkey: new PublicKey(key.pubkey),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
        programId: new PublicKey(metadataInstruction.programId),
        data: Buffer.from(metadataInstruction.data),
      });

      console.log('Metadata transaction created successfully');
      return {
        transaction,
        success: true
      };
    } catch (error) {
      console.error('Failed to create metadata account:', error);
      return {
        transaction: new Transaction(),
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create metadata transaction'
      };
    }
  }
}
