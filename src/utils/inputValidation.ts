
import { SecurityConfig } from '../services/securityConfig';

// HTML sanitization function
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>\"'&]/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match];
    })
    .trim();
};

// Token name validation
export const validateTokenName = (name: string): { isValid: boolean; error?: string } => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Token name is required' };
  }
  
  if (name.length > SecurityConfig.MAX_TOKEN_NAME_LENGTH) {
    return { isValid: false, error: `Token name must be less than ${SecurityConfig.MAX_TOKEN_NAME_LENGTH} characters` };
  }

  // Check for potentially malicious patterns
  const dangerousPatterns = /<script|javascript:|data:|vbscript:|on\w+=/i;
  if (dangerousPatterns.test(name)) {
    return { isValid: false, error: 'Token name contains invalid characters' };
  }

  return { isValid: true };
};

// Token symbol validation
export const validateTokenSymbol = (symbol: string): { isValid: boolean; error?: string } => {
  if (!symbol || symbol.trim().length === 0) {
    return { isValid: false, error: 'Token symbol is required' };
  }

  if (symbol.length > SecurityConfig.MAX_TOKEN_SYMBOL_LENGTH) {
    return { isValid: false, error: `Token symbol must be less than ${SecurityConfig.MAX_TOKEN_SYMBOL_LENGTH} characters` };
  }

  // Only allow alphanumeric characters
  if (!/^[A-Z0-9]+$/i.test(symbol)) {
    return { isValid: false, error: 'Token symbol can only contain letters and numbers' };
  }

  return { isValid: true };
};

// Token supply validation
export const validateTokenSupply = (supply: number): { isValid: boolean; error?: string } => {
  if (!supply || supply < SecurityConfig.MIN_TOKEN_SUPPLY) {
    return { isValid: false, error: `Token supply must be at least ${SecurityConfig.MIN_TOKEN_SUPPLY}` };
  }

  if (supply > SecurityConfig.MAX_TOKEN_SUPPLY) {
    return { isValid: false, error: `Token supply cannot exceed ${SecurityConfig.MAX_TOKEN_SUPPLY.toLocaleString()}` };
  }

  if (!Number.isInteger(supply)) {
    return { isValid: false, error: 'Token supply must be a whole number' };
  }

  return { isValid: true };
};

// Decimals validation
export const validateDecimals = (decimals: number): { isValid: boolean; error?: string } => {
  if (decimals < 0 || decimals > SecurityConfig.MAX_DECIMALS) {
    return { isValid: false, error: `Decimals must be between 0 and ${SecurityConfig.MAX_DECIMALS}` };
  }

  if (!Number.isInteger(decimals)) {
    return { isValid: false, error: 'Decimals must be a whole number' };
  }

  return { isValid: true };
};

// File validation for image uploads
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  if (file.size > SecurityConfig.MAX_FILE_SIZE) {
    return { isValid: false, error: `File size must be less than ${SecurityConfig.MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }

  if (!SecurityConfig.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { isValid: false, error: 'File must be a valid image (PNG, JPEG, GIF, or WebP)' };
  }

  return { isValid: true };
};

// Wallet address validation
export const validateWalletAddress = (address: string): { isValid: boolean; error?: string } => {
  if (!address || address.trim().length === 0) {
    return { isValid: false, error: 'Wallet address is required' };
  }

  // Basic Solana address validation (base58, 32-44 characters)
  const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (!base58Pattern.test(address)) {
    return { isValid: false, error: 'Invalid wallet address format' };
  }

  return { isValid: true };
};
