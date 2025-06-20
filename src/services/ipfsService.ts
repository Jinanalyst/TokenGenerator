import { create } from '@web3-storage/w3up-client';

// This defines the structure for your token's metadata.
export interface SolanaTokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string; // ipfs://<cid>/logo.png
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export class IPFSService {
  // DID for your Solana Token ai agent space
  private static readonly SPACE_DID = 'did:key:z6MkjPP1qt5cEpwgfQHYBm86g4yq9YbkyywbfVNA8Nk325yV';

  /**
   * Uploads the logo and metadata.json to Web3.Storage using w3up-client.
   * @param name Token name
   * @param symbol Token symbol
   * @param description Token description
   * @param imageFile File (logo)
   * @returns metadataUri (ipfs://<cid>/metadata.json)
   */
  public static async uploadTokenData(
    name: string,
    symbol: string,
    description: string,
    imageFile: File
  ): Promise<string> {
    // Create the w3up client
    const client = await create();
    // Set the current space
    await client.setCurrentSpace(this.SPACE_DID);

    // Prepare the metadata object (image will be ipfs://<cid>/logo.png after upload)
    const metadata: SolanaTokenMetadata = {
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      description: description.trim(),
      image: 'ipfs://PLACEHOLDER/logo.png', // Will be replaced after upload
      external_url: 'https://github.com/Jinanalyst/TokenGenerator',
      attributes: [
        { trait_type: 'Created By', value: 'Jinanalyst' }
      ]
    };

    // Prepare files for upload
    const files = [
      new File([imageFile], 'logo.png', { type: imageFile.type }),
      new File([JSON.stringify(metadata, null, 2)], 'metadata.json', { type: 'application/json' })
    ];

    // Upload directory to Web3.Storage
    const cid = await client.uploadDirectory(files);

    // Update metadata with the correct image URI
    const metadataWithImage = {
      ...metadata,
      image: `ipfs://${cid}/logo.png`
    };
    const metadataFile = new File([
      JSON.stringify(metadataWithImage, null, 2)
    ], 'metadata.json', { type: 'application/json' });

    // Re-upload metadata.json with correct image URI
    const finalCid = await client.uploadDirectory([
      new File([imageFile], 'logo.png', { type: imageFile.type }),
      metadataFile
    ]);

    // Return the metadata URI
    return `ipfs://${finalCid}/metadata.json`;
  }
}