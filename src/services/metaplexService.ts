import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import {
  DataV2,
  CreateMetadataAccountV3InstructionAccounts,
  CreateMetadataAccountV3InstructionArgs,
  CreateMetadataAccountV3InstructionData
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
    console.log('Creating token metadata transaction...');
    
    const metadataAddress = MetaplexService.getMetadataAddress(mintPublicKey);
    
    // Create the metadata instruction data
    const data = {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      creators: metadata.creators || null,
      collection: metadata.collection || null,
      uses: metadata.uses || null,
    };

    // Create the instruction accounts
    const accounts: CreateMetadataAccountV3InstructionAccounts = {
      metadata: metadataAddress,
      mint: mintPublicKey,
      mintAuthority: payerPublicKey,
      payer: payerPublicKey,
      updateAuthority: payerPublicKey,
    };

    // Create the instruction args
    const args: CreateMetadataAccountV3InstructionArgs = {
      createMetadataAccountArgsV3: {
        data,
        isMutable: true,
        collectionDetails: null,
      },
    };

    // Create the instruction
    const instruction = {
      programId: TOKEN_METADATA_PROGRAM_ID,
      keys: [
        { pubkey: accounts.metadata, isSigner: false, isWritable: true },
        { pubkey: accounts.mint, isSigner: false, isWritable: false },
        { pubkey: accounts.mintAuthority, isSigner: true, isWritable: false },
        { pubkey: accounts.payer, isSigner: true, isWritable: true },
        { pubkey: accounts.updateAuthority, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([
        0, // CreateMetadataAccountV3 instruction
        ...this.serializeCreateMetadataAccountV3Args(args.createMetadataAccountArgsV3),
      ]),
    };

    const transaction = new Transaction();
    transaction.add(instruction);
    
    console.log('Metadata transaction created successfully');
    console.log('Token details:', {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mint: mintPublicKey.toString(),
      metadataAddress: metadataAddress.toString()
    });
    
    return transaction;
  }

  private serializeCreateMetadataAccountV3Args(args: any): Buffer {
    // Simple serialization for the metadata args
    const buffers: Buffer[] = [];
    
    // Serialize name (string)
    const nameBuffer = Buffer.from(args.data.name, 'utf8');
    buffers.push(Buffer.from([nameBuffer.length]));
    buffers.push(nameBuffer);
    
    // Serialize symbol (string)
    const symbolBuffer = Buffer.from(args.data.symbol, 'utf8');
    buffers.push(Buffer.from([symbolBuffer.length]));
    buffers.push(symbolBuffer);
    
    // Serialize URI (string)
    const uriBuffer = Buffer.from(args.data.uri, 'utf8');
    buffers.push(Buffer.from([uriBuffer.length]));
    buffers.push(uriBuffer);
    
    // Serialize seller fee basis points (u16)
    const feeBuffer = Buffer.alloc(2);
    feeBuffer.writeUInt16LE(args.data.sellerFeeBasisPoints, 0);
    buffers.push(feeBuffer);
    
    // Serialize creators (optional array)
    if (args.data.creators) {
      buffers.push(Buffer.from([1])); // Has creators
      buffers.push(Buffer.from([args.data.creators.length])); // Array length
      for (const creator of args.data.creators) {
        buffers.push(creator.address.toBuffer());
        buffers.push(Buffer.from([creator.verified ? 1 : 0]));
        buffers.push(Buffer.from([creator.share]));
      }
    } else {
      buffers.push(Buffer.from([0])); // No creators
    }
    
    // Serialize collection (optional)
    if (args.data.collection) {
      buffers.push(Buffer.from([1])); // Has collection
      buffers.push(Buffer.from([args.data.collection.verified ? 1 : 0]));
      buffers.push(args.data.collection.key.toBuffer());
    } else {
      buffers.push(Buffer.from([0])); // No collection
    }
    
    // Serialize uses (optional)
    if (args.data.uses) {
      buffers.push(Buffer.from([1])); // Has uses
      buffers.push(Buffer.from([args.data.uses.useMethod]));
      buffers.push(Buffer.alloc(8).writeBigUInt64LE(BigInt(args.data.uses.remaining), 0));
      buffers.push(Buffer.alloc(8).writeBigUInt64LE(BigInt(args.data.uses.total), 0));
    } else {
      buffers.push(Buffer.from([0])); // No uses
    }
    
    // Serialize isMutable (bool)
    buffers.push(Buffer.from([args.isMutable ? 1 : 0]));
    
    // Serialize collectionDetails (optional)
    if (args.collectionDetails) {
      buffers.push(Buffer.from([1])); // Has collection details
      // Add collection details serialization here if needed
    } else {
      buffers.push(Buffer.from([0])); // No collection details
    }
    
    return Buffer.concat(buffers);
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
