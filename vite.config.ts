import { defineConfig } from 'vite';

export default defineConfig({
  base: '/quickbasic-emulator/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
