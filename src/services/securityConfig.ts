
import { PublicKey } from '@solana/web3.js';

// Security configuration with transparent fee structure
export const SecurityConfig = {
  // Fee recipient - transparent and configurable
  getFeeRecipient: (): PublicKey => {
    // Clear documentation: This is a service fee for token creation
    const feeRecipientAddress = import.meta.env.VITE_FEE_RECIPIENT || '2zmewxtyL83t6WLkSPpQtdDiK5Nmd5KSn71HKC7TEGcU';
    return new PublicKey(feeRecipientAddress);
  },

  // Reduced and transparent fee structure
  TRANSPARENT_FEES: {
    TOKEN_CREATION: 0.001, // Reduced from 0.02 to 0.001 SOL
    METADATA_UPLOAD: 0.001, // Small fee for IPFS upload
    NETWORK_FEES: 0.005 // Estimated network transaction fees
  },

  // Clear documentation of what fees cover
  FEE_EXPLANATION: {
    purpose: "Service fees cover platform maintenance, RPC costs, and IPFS hosting",
    optional: true,
    collected_after: "successful token creation",
    transparency: "All fees are clearly displayed before transaction"
  },

  // Allowed external domains for safe redirects
  ALLOWED_DOMAINS: [
    'phantom.app',
    'solflare.com',
    'backpack.app',
    'glow.app',
    'raydium.io',
    'explorer.solana.com',
    'dexscreener.com'
  ],

  // File upload constraints
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],

  // Token validation constraints
  MAX_TOKEN_NAME_LENGTH: 50,
  MAX_TOKEN_SYMBOL_LENGTH: 10,
  MAX_TOKEN_DESCRIPTION_LENGTH: 500,
  MIN_TOKEN_SUPPLY: 1,
  MAX_TOKEN_SUPPLY: 1000000000000, // 1 trillion
  MAX_DECIMALS: 18,

  // Security best practices
  SECURITY_PRACTICES: {
    no_private_keys_stored: true,
    standard_solana_protocols: true,
    transparent_transactions: true,
    optional_fees: true,
    open_source_compatible: true
  }
};
