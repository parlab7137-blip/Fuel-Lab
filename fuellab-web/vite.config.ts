import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // @fuellab/shared is a symlinked file: dep whose real path sits outside
    // node_modules, so include it in CommonJS transformation explicitly.
    commonjsOptions: { include: [/fuellab-shared/, /node_modules/] },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
