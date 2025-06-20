
declare global {
  interface Window {
    Buffer: typeof Buffer;
    global: typeof globalThis;
    process: any; // More flexible type for browser polyfill
    util: {
      inherits: (ctor: any, superCtor: any) => void;
      format: (f: string, ...args: any[]) => string;
    };
    stream: {
      Readable: any;
      PassThrough: any;
    };
    http: {
      STATUS_CODES: Record<string, string>;
    };
    url: {
      URL: typeof URL;
      parse: (urlString: string) => any;
      format: (urlObject: any) => string;
    };
  }
}

export {};
