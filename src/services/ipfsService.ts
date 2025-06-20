// This defines the structure for your token's metadata.
export interface SolanaTokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string; // This will be the full IPFS gateway URL for the image.
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export class IPFSService {
  // --- Your Pinata JWT (Access Token) ---
  private static readonly PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjYTM4Y2VlOC01YTg3LTQ5YjEtOTUyMi04OGY3YTRjZmNhMGYiLCJlbWFpbCI6ImppbndvbzUzODVAbmF2ZXIuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjJkMDFmOGI4NGI3Njk5M2VlZjZkIiwic2NvcGVkS2V5U2VjcmV0IjoiMDIwM2E3YjQzYTNkMzQ0M2NhMWY0ZjFlYzExODMwYjA2NTc0OGU1ZTE1MTU1ZGUzMTQ5NjhiYjhjZDcxYjU1NSIsImV4cCI6MTc4MTkzNDAyOH0.rXr9I7yd-UkMfcpWLV778K2L3v2QZQaeTabxRzfAPos';
  
  private static readonly PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
  private static readonly IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

  /**
   * Uploads an image, creates the metadata JSON, uploads the JSON,
   * and returns the final metadata URL.
   *
   * @param name The name of the token.
   * @param symbol The symbol of the token.
   * @param description A description for the token.
   * @param imageFile The token's logo (as a File object).
   * @returns The public, final URL for the metadata.json file.
   */
  public static async uploadTokenData(
    name: string,
    symbol: string,
    description: string,
    imageFile: File
  ): Promise<string> {
    if (!this.PINATA_JWT) {
      throw new Error('Pinata JWT is not configured. Please add it to ipfsService.ts');
    }

    try {
      // 1. Upload the image file to Pinata.
      console.log('Uploading image to Pinata...');
      const imageFormData = new FormData();
      imageFormData.append('file', imageFile, imageFile.name);
      
      const imageResponse = await fetch(this.PINATA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PINATA_JWT}`
        },
        body: imageFormData,
      });

      if (!imageResponse.ok) {
        throw new Error(`Pinata image upload failed: ${await imageResponse.text()}`);
      }

      const imageData = await imageResponse.json();
      const imageCid = imageData.IpfsHash;
      const imageUrl = `${this.IPFS_GATEWAY}/${imageCid}`;
      console.log(`Image uploaded successfully. URL: ${imageUrl}`);

      // 2. Create the metadata JSON object.
      const metadata: SolanaTokenMetadata = {
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim(),
        image: imageUrl, // Use the full gateway URL for the image
        external_url: "https://github.com/Jinanalyst/TokenGenerator",
        attributes: [
          { trait_type: 'Created By', value: 'Jinanalyst' }
        ]
      };
      console.log('Constructed metadata:', metadata);

      // 3. Upload the metadata JSON to Pinata.
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const metadataFile = new File([metadataBlob], 'metadata.json');

      const metadataFormData = new FormData();
      metadataFormData.append('file', metadataFile, 'metadata.json');

      const metadataResponse = await fetch(this.PINATA_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PINATA_JWT}`
        },
        body: metadataFormData
      });

      if (!metadataResponse.ok) {
        throw new Error(`Pinata metadata upload failed: ${await metadataResponse.text()}`);
      }
      
      const metadataUploadData = await metadataResponse.json();
      const metadataCid = metadataUploadData.IpfsHash;
      const finalMetadataUrl = `${this.IPFS_GATEWAY}/${metadataCid}`;
      console.log(`Metadata uploaded successfully. Final URL: ${finalMetadataUrl}`);

      return finalMetadataUrl;

    } catch (error) {
      console.error('Failed to upload token data to IPFS via Pinata:', error);
      throw error;
    }
  }
}