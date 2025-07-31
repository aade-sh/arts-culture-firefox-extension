import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const isNewtab = process.env.BUILD_TARGET === 'newtab';
  
  return {
    plugins: [
      preact({
        // Use Preact compat for React compatibility
        reactAliasesEnabled: true
      })
    ],
    build: {
      rollupOptions: {
        input: isNewtab 
          ? resolve(__dirname, 'src/newtab.tsx')
          : resolve(__dirname, 'src/background/background.ts'),
        output: {
          entryFileNames: isNewtab ? 'newtab-bundle.js' : 'background.js',
          format: 'iife',
          name: isNewtab ? 'NewTabApp' : 'Background',
          dir: isNewtab ? 'newtab' : 'dist'
        }
      },
      target: 'es2020',
      minify: true,
      emptyOutDir: false
    },
    resolve: {
      alias: {
        'react': 'preact/compat',
        'react-dom': 'preact/compat'
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production')
    },
    // Browser extension specific settings
    assetsDir: '', // Keep assets in root of output directory
    sourcemap: false // Disable sourcemaps for production
  };
});