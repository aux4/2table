import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'executable.js',
  output: {
    file: 'package/lib/aux4-2table.js',
    format: 'esm',
  },
  plugins: [
    json(),
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs(),
  ],
  external: []
};