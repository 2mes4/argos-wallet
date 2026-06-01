import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  resolve: {
    conditions: ['import'],
  },
  build: {
    outDir: 'dist',
  },
});
