import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import path from 'path';

export default [
  // New Tab bundle
  {
    input: 'src/newtab.tsx',
    output: {
      file: 'newtab/newtab-bundle.js',
      format: 'iife',
      name: 'NewTabApp'
    },
    plugins: [
      alias({
        entries: [
          { find: 'react', replacement: 'preact/compat' },
          { find: 'react-dom', replacement: 'preact/compat' }
        ]
      }),
      typescript({
        tsconfig: './tsconfig.json'
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
        preventAssignment: true
      }),
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      terser()
    ]
  },
  // Background script bundle
  {
    input: 'js/background.ts',
    output: {
      file: 'dist/background.js',
      format: 'iife',
      name: 'Background'
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json'
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
        preventAssignment: true
      }),
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      terser()
    ]
  }
];