
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
  // Using a public IPFS service that doesn't require API keys
  private static readonly PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';
  
  static async uploadImageToIPFS(imageBlob: Blob, filename: string): Promise<string> {
    try {
      console.log('Uploading image to IPFS via public gateway...');
      
      // Use a public IPFS pinning service
      const formData = new FormData();
      formData.append('file', imageBlob, filename);

      // Try multiple public IPFS endpoints for reliability
      const endpoints = [
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        'https://api.nft.storage/upload'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            const hash = data.IpfsHash || data.cid;
            if (hash) {
              const imageUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
              console.log('Image uploaded successfully:', imageUrl);
              return imageUrl;
            }
          }
        } catch (error) {
          console.warn(`Failed to upload to ${endpoint}:`, error);
          continue;
        }
      }

      // Fallback: Create a data URL for immediate display
      console.log('All IPFS uploads failed, using fallback data URL');
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageBlob);
      });
    } catch (error) {
      console.error('IPFS image upload failed:', error);
      // Return data URL as fallback
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageBlob);
      });
    }
  }

  static async uploadMetadataToIPFS(metadata: TokenMetadata): Promise<string> {
    try {
      console.log('Uploading metadata to IPFS...');
      
      const metadataString = JSON.stringify(metadata, null, 2);
      const metadataBlob = new Blob([metadataString], {
        type: 'application/json'
      });

      const formData = new FormData();
      formData.append('file', metadataBlob, 'metadata.json');

      // Try multiple public IPFS endpoints
      const endpoints = [
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        'https://api.nft.storage/upload'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            const hash = data.IpfsHash || data.cid;
            if (hash) {
              const metadataUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
              console.log('Metadata uploaded successfully:', metadataUrl);
              return metadataUrl;
            }
          }
        } catch (error) {
          console.warn(`Failed to upload metadata to ${endpoint}:`, error);
          continue;
        }
      }

      // If all IPFS uploads fail, create a local JSON URL as fallback
      console.log('All IPFS metadata uploads failed, using fallback');
      const jsonUrl = URL.createObjectURL(metadataBlob);
      return jsonUrl;
    } catch (error) {
      console.error('IPFS metadata upload failed:', error);
      throw new Error('Failed to upload metadata to IPFS');
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
        },
        {
          trait_type: 'Network',
          value: 'Solana'
        }
      ]
    };
  }

  // Helper method to validate IPFS URLs
  static validateIPFSUrl(url: string): boolean {
    return url.startsWith('https://') && (
      url.includes('ipfs') || 
      url.includes('pinata') || 
      url.includes('gateway')
    );
  }
}
