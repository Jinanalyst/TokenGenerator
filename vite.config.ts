
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "stream": "stream-browserify",
      "http": "http-browserify",
      "url": "url",
      "util": "util",
    },
  },
  define: {
    global: 'globalThis',
    process: {
      env: {},
    },
  },
  optimizeDeps: {
    include: [
      'buffer', 
      'stream-browserify', 
      'http-browserify', 
      'url',
      'util',
      '@metaplex-foundation/umi-bundle-defaults',
      '@metaplex-foundation/mpl-token-metadata'
    ],
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {
          buffer: 'Buffer',
        },
      },
    },
  },
}));
