export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export class IPFSService {
  private static readonly IPFS_UPLOAD_URL = 'https://ipfs.io/api/v0/add';
  private static readonly IPFS_GATEWAY = 'https://ipfs.io/ipfs';

  static async uploadImageToIPFS(imageBlob: Blob, filename: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, filename);

      const response = await fetch(IPFSService.IPFS_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image to IPFS');
      }

      const data = await response.json();
      return `${IPFSService.IPFS_GATEWAY}/${data.Hash}`;
    } catch (error) {
      console.error('IPFS image upload failed:', error);
      throw error;
    }
  }

  static async uploadMetadataToIPFS(metadata: TokenMetadata): Promise<string> {
    try {
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: 'application/json'
      });

      const formData = new FormData();
      formData.append('file', metadataBlob, 'metadata.json');

      const response = await fetch(IPFSService.IPFS_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      const data = await response.json();
      return `${IPFSService.IPFS_GATEWAY}/${data.Hash}`;
    } catch (error) {
      console.error('IPFS metadata upload failed:', error);
      throw error;
    }
  }

  static async createTokenMetadata(
    name: string,
    symbol: string,
    description: string = '',
    imageUrl: string
  ): Promise<TokenMetadata> {
    return {
      name,
      symbol,
      description: description || `${name} (${symbol}) - Created with Solana Token Generator AI`,
      image: imageUrl,
      external_url: 'https://solana-token-bot-genie.lovable.app',
      attributes: [
        {
          trait_type: 'Created By',
          value: 'Solana Token Generator AI'
        },
        {
          trait_type: 'Symbol',
          value: symbol
        }
      ]
    };
  }
}
