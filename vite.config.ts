// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        extension: resolve(__dirname, 'src/extension.ts'),
      },
      formats: ['cjs'],
      fileName: (format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      external: [
        'vscode',
        'path',
        'fs',
        'fs/promises',
        'os',
        'child_process',
        'util',
        'crypto',
        'http',
        'https',
        'url',
        'stream',
        'zlib',
        'events',
        'simple-git',
        '@vscode/test-electron',
        'mocha',
        'glob',
        'timers'
      ]
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node20',
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    terserOptions: {
      keep_classnames: true,
      keep_fnames: true,
      compress: {
        drop_debugger: false
      }
    }
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  optimizeDeps: {
    exclude: ['fs', 'fs/promises', 'timers']
  }
});
