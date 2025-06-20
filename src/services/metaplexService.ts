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
import { some } from '@metaplex-foundation/umi/serializers';

export class MetaplexService {
  private connection: Connection;
  private umi: any;

  constructor(connection: Connection, wallet?: any) {
    this.connection = connection;
    this.umi = createUmi(connection.rpcEndpoint);
    if (wallet) {
      this.umi.use(walletAdapterIdentity(wallet));
    }
  }

  setWallet(wallet: any) {
    this.umi.use(walletAdapterIdentity(wallet));
  }

  async uploadAndCreateMetadata(
    tokenName: string,
    tokenSymbol: string,
    description: string,
    imageFile: Blob,
    mintPublicKey: PublicKey,
    payerPublicKey: PublicKey
  ): Promise<{ transaction: Transaction; metadataUri: string }> {
    console.log('Uploading image and metadata to IPFS...');
    const imageUrl = await IPFSService.uploadImageToIPFS(imageFile, `${tokenSymbol.toLowerCase()}_logo.png`);
    const tokenMetadata = await IPFSService.createTokenMetadata(tokenName, tokenSymbol, description, imageUrl);
    const metadataUri = await IPFSService.uploadMetadataToIPFS(tokenMetadata);
    console.log('Metadata URI:', metadataUri);

    console.log('Creating metadata transaction with Umi...');
    
    const accounts: CreateV1InstructionAccounts = {
      mint: mintPublicKey.toString() as any,
      authority: this.umi.identity,
    };
    
    const data: CreateV1InstructionArgs = {
      name: tokenName,
      symbol: tokenSymbol,
      uri: metadataUri,
      sellerFeeBasisPoints: 0,
      creators: some([{ address: this.umi.identity.publicKey, verified: true, share: 100 }]),
      primarySaleHappened: true,
      isMutable: true,
      tokenStandard: TokenStandard.Fungible,
      collection: null,
      uses: null,
      collectionDetails: null,
      ruleSet: null,
    };

    const instruction = createV1(this.umi, {
      ...accounts,
      ...data,
    });

    const transaction = new Transaction().add({
      ...instruction.getInstructions()[0],
      programId: new PublicKey(instruction.getInstructions()[0].programId),
    });

    console.log('Metadata transaction created successfully.');
    
    return { transaction, metadataUri };
  }
}
