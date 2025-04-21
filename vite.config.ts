// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';
// import versionIncrementPlugin from './plugins/versionIncrementPlugin';


export default defineConfig({
  // plugins: [versionIncrementPlugin({
  //   env: ['production'] // 只在生产环境自增版本号
  // })],
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
        '@vscode/test-electron',
        'mocha',
        'glob',
        'timers',
        "simple-git"
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
    extensions: ['.ts', '.js'],
    alias: {
      'node:events': 'events'
    }
  },
  optimizeDeps: {
    exclude: ['fs', 'fs/promises', 'timers']
  }
});
