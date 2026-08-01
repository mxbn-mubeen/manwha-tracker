import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
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
  server: {
    port: 3000,
  },
});
