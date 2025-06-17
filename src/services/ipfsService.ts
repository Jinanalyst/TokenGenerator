
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
  private static readonly PINATA_API_URL = 'https://api.pinata.cloud/pinning';
  private static readonly PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

  static async uploadImageToIPFS(imageBlob: Blob, filename: string): Promise<string> {
    try {
      // For demo purposes, we'll use a public IPFS service
      // In production, you'd want to use your own Pinata API keys
      const formData = new FormData();
      formData.append('file', imageBlob, filename);

      // Using a public IPFS upload service as fallback
      const response = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer YOUR_WEB3_STORAGE_TOKEN' // This would need to be configured
        }
      });

      if (!response.ok) {
        throw new Error('Failed to upload image to IPFS');
      }

      const data = await response.json();
      return `https://dweb.link/ipfs/${data.cid}`;
    } catch (error) {
      console.error('IPFS image upload failed:', error);
      // Fallback: return the base64 data URL for now
      return URL.createObjectURL(imageBlob);
    }
  }

  static async uploadMetadataToIPFS(metadata: TokenMetadata): Promise<string> {
    try {
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: 'application/json'
      });

      const formData = new FormData();
      formData.append('file', metadataBlob, 'metadata.json');

      // Using a public IPFS upload service as fallback
      const response = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer YOUR_WEB3_STORAGE_TOKEN' // This would need to be configured
        }
      });

      if (!response.ok) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      const data = await response.json();
      return `https://dweb.link/ipfs/${data.cid}`;
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
