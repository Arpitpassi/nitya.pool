import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@arweave-wallet-kit')) {
            return 'arweave-wallet-kit'
          } else if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})