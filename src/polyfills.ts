
import { Buffer } from 'buffer';

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.global = window.global || window;
  window.process = { env: {} };
}

// Polyfill for util module (needed by http-browserify)
if (typeof window !== 'undefined' && !window.util) {
  try {
    const util = require('util');
    window.util = util;
  } catch (e) {
    // Fallback util polyfill with inherits function
    window.util = {
      inherits: function(ctor: any, superCtor: any) {
        if (superCtor) {
          ctor.super_ = superCtor;
          ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
              value: ctor,
              enumerable: false,
              writable: true,
              configurable: true
            }
          });
        }
      },
      format: function(f: string, ...args: any[]) {
        return f.replace(/%[sdj%]/g, function(x) {
          if (args.length === 0) return x;
          switch (x) {
            case '%s': return String(args.shift());
            case '%d': return Number(args.shift());
            case '%j':
              try {
                return JSON.stringify(args.shift());
              } catch (_) {
                return '[Circular]';
              }
            default:
              return x;
          }
        });
      }
    };
  }
}

// Polyfill for stream module
if (typeof window !== 'undefined' && !window.stream) {
  try {
    const stream = require('stream-browserify');
    window.stream = stream;
  } catch (e) {
    // Fallback if stream-browserify is not available
    window.stream = {
      Readable: class Readable {},
      PassThrough: class PassThrough {},
    };
  }
}

// Polyfill for http module
if (typeof window !== 'undefined' && !window.http) {
  try {
    const http = require('http-browserify');
    window.http = http;
  } catch (e) {
    // Fallback if http-browserify is not available
    window.http = {
      STATUS_CODES: {},
    };
  }
}

// Polyfill for url module
if (typeof window !== 'undefined' && !window.url) {
  try {
    const url = require('url');
    window.url = url;
  } catch (e) {
    // Fallback URL polyfill
    window.url = {
      URL: window.URL || URL,
      parse: (urlString: string) => {
        try {
          const url = new URL(urlString);
          return {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port,
            pathname: url.pathname,
            search: url.search,
            hash: url.hash,
          };
        } catch {
          return {};
        }
      },
      format: (urlObject: any) => {
        if (typeof urlObject === 'string') return urlObject;
        return `${urlObject.protocol || 'https:'}//${urlObject.hostname || 'localhost'}${urlObject.pathname || ''}${urlObject.search || ''}${urlObject.hash || ''}`;
      },
    };
  }
}

export {};
