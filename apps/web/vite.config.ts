import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  envDir: '../../',
  plugins: [
    tailwindcss(),
    react()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@manhwa-tracker/utils': resolve(__dirname, '../../libs/utils/src/index.ts'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          trpc: ['@trpc/client', '@trpc/react-query', '@tanstack/react-query'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
