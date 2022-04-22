const commonjs = require('@rollup/plugin-commonjs');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const { babel } = require('@rollup/plugin-babel');
const { terser } = require('rollup-plugin-terser');

const baseOpts = {
    output: {
        dir: 'dist/js',
        format: 'iife',
        sourcemap: true,
    },
    plugins: [
        nodeResolve(),
        commonjs(),
        babel({ babelHelpers: 'bundled' }),
        terser()
    ]
};

if (process.env.NODE_ENV === 'development')
    baseOpts.output.name = 'test';

module.exports = [
    { input: 'src/js/main.js' },
].map(bundle => ({
    ...baseOpts,
    ...bundle
}));
