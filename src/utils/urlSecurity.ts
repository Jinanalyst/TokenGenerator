
import { SecurityConfig } from '../services/securityConfig';

// Safe URL validation and opening
export const openSecureUrl = (url: string, confirmationMessage?: string): boolean => {
  try {
    const urlObj = new URL(url);
    
    // Check if domain is in allowed list
    const isAllowedDomain = SecurityConfig.ALLOWED_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );

    if (!isAllowedDomain) {
      console.warn(`Blocked attempt to open unauthorized URL: ${url}`);
      return false;
    }

    // Show confirmation dialog if provided
    if (confirmationMessage) {
      const confirmed = window.confirm(`${confirmationMessage}\n\nYou will be redirected to: ${urlObj.hostname}`);
      if (!confirmed) {
        return false;
      }
    }

    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  } catch (error) {
    console.error('Invalid URL provided:', error);
    return false;
  }
};

// Validate URL without opening
export const validateUrl = (url: string): { isValid: boolean; error?: string } => {
  try {
    const urlObj = new URL(url);
    
    const isAllowedDomain = SecurityConfig.ALLOWED_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );

    if (!isAllowedDomain) {
      return { isValid: false, error: 'URL domain is not allowed' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

// Create safe Raydium URL
export const createRaydiumUrl = (tokenAddress: string, network: 'mainnet' | 'devnet' = 'devnet'): string => {
  const baseUrl = network === 'mainnet' 
    ? 'https://raydium.io/liquidity/create'
    : 'https://raydium.io/liquidity/create/?cluster=devnet';
  
  // Validate token address format before creating URL
  const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (!base58Pattern.test(tokenAddress)) {
    throw new Error('Invalid token address format');
  }
  
  return `${baseUrl}${network === 'mainnet' ? '?' : '&'}token=${encodeURIComponent(tokenAddress)}`;
};
