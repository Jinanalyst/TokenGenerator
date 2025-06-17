import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import {
  createMetadataAccountV3Instruction,
  CreateMetadataAccountV3InstructionAccounts,
  CreateMetadataAccountV3InstructionData,
  DataV2
} from '@metaplex-foundation/mpl-token-metadata';
import { IPFSService } from './ipfsService';

// Correct Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export interface MetaplexTokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators?: Array<{
    address: PublicKey;
    verified: boolean;
    share: number;
  }>;
  collection?: {
    verified: boolean;
    key: PublicKey;
  };
  uses?: {
    useMethod: any;
    remaining: number;
    total: number;
  };
}

export class MetaplexService {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  static getMetadataAddress(mintPublicKey: PublicKey): PublicKey {
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPublicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    return metadataAddress;
  }

  async createTokenMetadata(
    mintPublicKey: PublicKey,
    payerPublicKey: PublicKey,
    metadata: MetaplexTokenMetadata
  ): Promise<Transaction> {
    const metadataAddress = MetaplexService.getMetadataAddress(mintPublicKey);

    const accounts: CreateMetadataAccountV3InstructionAccounts = {
      metadata: metadataAddress,
      mint: mintPublicKey,
      mintAuthority: payerPublicKey,
      payer: payerPublicKey,
      updateAuthority: payerPublicKey,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    };

    const dataV2: DataV2 = {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      creators: metadata.creators || null,
      collection: metadata.collection || null,
      uses: metadata.uses || null,
    };

    const instructionData: CreateMetadataAccountV3InstructionData = {
      data: dataV2,
      isMutable: true,
      collectionDetails: null,
    };

    const createMetadataInstruction = createMetadataAccountV3Instruction(
      accounts,
      instructionData
    );

    const transaction = new Transaction().add(createMetadataInstruction);
    return transaction;
  }

  async uploadAndCreateMetadata(
    tokenName: string,
    tokenSymbol: string,
    description: string,
    imageFile: Blob,
    mintPublicKey: PublicKey,
    payerPublicKey: PublicKey
  ): Promise<{ transaction: Transaction; metadataUri: string }> {
    console.log('Uploading image to IPFS...');
    const imageUrl = await IPFSService.uploadImageToIPFS(imageFile, `${tokenSymbol.toLowerCase()}_logo.png`);
    
    console.log('Creating metadata object...');
    const tokenMetadata = await IPFSService.createTokenMetadata(
      tokenName,
      tokenSymbol,
      description,
      imageUrl
    );

    console.log('Uploading metadata to IPFS...');
    const metadataUri = await IPFSService.uploadMetadataToIPFS(tokenMetadata);

    console.log('Creating metadata transaction...');
    const metaplexMetadata: MetaplexTokenMetadata = {
      name: tokenName,
      symbol: tokenSymbol,
      uri: metadataUri,
      sellerFeeBasisPoints: 0,
      creators: [
        {
          address: payerPublicKey,
          verified: false,
          share: 100,
        },
      ],
    };

    const transaction = await this.createTokenMetadata(
      mintPublicKey,
      payerPublicKey,
      metaplexMetadata
    );

    return { transaction, metadataUri };
  }
}
