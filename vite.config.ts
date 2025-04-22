// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';
import versionIncrementPlugin from './plugins/versionIncrementPlugin';

export default defineConfig(({ mode }) => {
  return {
    plugins: [versionIncrementPlugin({
      env: ['production'],
      mode: mode
    })],
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
          "events",
          "node:events",
          // "simple-git"  //todo：github actions编译报错。 解开注释后，无法编译通过，但插件无法正常使用
        ]
      },
      sourcemap: true,
      outDir: 'dist',
      emptyOutDir: true,
      target: 'node20',
      minify: mode.startsWith('production') ? 'terser' : false,
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
  }
})