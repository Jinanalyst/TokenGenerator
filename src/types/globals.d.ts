
declare global {
  interface Window {
    Buffer: typeof Buffer;
    global: typeof globalThis;
    process: {
      env: Record<string, string | undefined>;
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
