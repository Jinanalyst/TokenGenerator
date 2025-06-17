
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom: boolean;
        connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: any }>;
        disconnect: () => Promise<void>;
        signTransaction: (transaction: any) => Promise<any>;
        signAllTransactions: (transactions: any[]) => Promise<any[]>;
      };
    };
    solflare?: {
      isSolflare: boolean;
      connect: () => Promise<{ publicKey: any }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
    };
    backpack?: {
      isBackpack: boolean;
      connect: () => Promise<{ publicKey: any }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
    };
  }
}

export {};
