
import { PublicKey } from '@solana/web3.js';

// Security configuration with environment variable support
export const SecurityConfig = {
  // Fee recipient - should be configured via environment variable in production
  getFeeRecipient: (): PublicKey => {
    // In production, this should come from environment variables
    // For now, using the existing address but making it configurable
    const feeRecipientAddress = import.meta.env.VITE_FEE_RECIPIENT || '2zmewxtyL83t6WLkSPpQtdDiK5Nmd5KSn71HKC7TEGcU';
    return new PublicKey(feeRecipientAddress);
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
  MAX_DECIMALS: 18
};
