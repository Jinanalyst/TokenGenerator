
// Secure error handling that doesn't expose sensitive information
export const createUserFriendlyError = (error: any, context: string): string => {
  // Log detailed error for developers (would go to monitoring in production)
  console.error(`[${context}] Detailed error:`, error);

  // Return sanitized user-friendly messages
  if (error?.message) {
    const message = error.message.toLowerCase();
    
    if (message.includes('user rejected') || message.includes('rejected')) {
      return 'Transaction was cancelled by user';
    }
    
    if (message.includes('insufficient') && message.includes('balance')) {
      return 'Insufficient balance to complete this transaction';
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return 'Network connection error. Please try again';
    }
    
    if (message.includes('timeout')) {
      return 'Transaction timed out. Please try again';
    }
    
    if (message.includes('invalid') && message.includes('address')) {
      return 'Invalid wallet address provided';
    }
  }

  // Generic fallback error messages by context
  const contextMessages: { [key: string]: string } = {
    'wallet_connection': 'Failed to connect wallet. Please try again',
    'token_creation': 'Failed to create token. Please check your inputs and try again',
    'transaction': 'Transaction failed. Please try again',
    'validation': 'Invalid input provided. Please check your data',
    'file_upload': 'File upload failed. Please try a different file'
  };

  return contextMessages[context] || 'An unexpected error occurred. Please try again';
};

// Rate limiting helper (simple in-memory implementation)
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  getRemainingTime(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    return Math.max(0, record.resetTime - Date.now());
  }
}

export const rateLimiter = new RateLimiter();
