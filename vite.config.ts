import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';

/**
 * Vite-config voor _Web.
 *
 * - base = /quickbasic-emulator/ voor productie-deploy op icthorse.nl
 * - vendor/qbjs/ wordt 1-op-1 gekopieerd naar dist/vendor/qbjs/ via post-build hook
 */
export default defineConfig({
  base: '/quickbasic-emulator/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  plugins: [
    {
      name: 'copy-qbjs-vendor',
      closeBundle() {
        const src = resolve(__dirname, 'vendor/qbjs');
        const dest = resolve(__dirname, 'dist/vendor/qbjs');
        if (!existsSync(src)) return;
        mkdirSync(dest, { recursive: true });
        cpSync(src, dest, { recursive: true });
        copyFileSync(resolve(__dirname, 'NOTICE.md'), resolve(__dirname, 'dist/NOTICE.md'));
      },
    },
  ],
});
