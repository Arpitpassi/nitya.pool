import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(), // Add React plugin to handle .jsx files
  ],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        dashboard: './dashboard.html',
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@arweave-wallet-kit')) {
            return 'arweave-wallet-kit';
          } else if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});