const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { series, parallel, ...gulp } = require('gulp');
const sass = require('sass');
const rollup = require('rollup');
const rollupConfig = require('./rollup.config.js');
const { mkdir } = require('./modules/utils.js');

const production = process.env.NODE_ENV === 'production';

/*
 * Eleventy
 */

const eleventy = (args, cb) => {
    let cmd = spawn('npx', ['@11ty/eleventy', ...args ]);
    cmd.on('close', cb);
    cmd.stdout.pipe(process.stdout);
    cmd.stderr.pipe(process.stderr);
};

const eleventyBuild = eleventy.bind(null, []);
const eleventyWatch = eleventy.bind(null, [ '--watch' ]);

exports.eleventy = eleventyBuild;

/*
 * CSS
 */

let compiledScss; // hold in memory to avoid scss recompiling

const css = async (recompile=true) => {
    let inFile = 'src/css/main.scss';
    let outFile = 'dist/css/main.css';
    let mapFile = outFile + '.map';
    let mkOutDir = mkdir(path.dirname(outFile));

    let output = compiledScss;
    if (recompile) {
        output = await sass.compileAsync(inFile, {
            loadPaths: ['node_modules', 'src/_sass'],
            quietDeps: true,
        });
        compiledScss = output;
    }

    const postcss = require('postcss');
    let postcssPlugins = [ require('tailwindcss') ];
    if (production)
        postcssPlugins = [
            require('postcss-sort-media-queries')({
                sort: 'desktop-first'
            }),
            require('postcss-uncss')({
                htmlroot: 'dist',
                html: [ 'dist/**/*.html' ],
                ignore: [ '*--*', 'hidden' ]
            }),
            require('tailwindcss'),
            require('postcss-aspect-ratio-polyfill'),
            require('autoprefixer'),
            require('postcss-flexbugs-fixes'),
            require('cssnano'),
        ];

    output = await postcss(postcssPlugins)
        .process(output.css, {
            from: inFile,
            to: outFile,
            map: { inline: false },
        });

    await mkOutDir;
    let tasks = [ fs.promises.writeFile(outFile, output.css) ];
    if (output.map)
        tasks.push(fs.promises.writeFile(mapFile, output.map.toString()));

    return Promise.all(tasks);
};

const { content:tailwindContent } = require('./tailwind.config.js');

const scssWatch = series(css, () => gulp.watch('src/{css,_sass}/**/*.scss', css));
const postcssWatch = series(css, () => gulp.watch(tailwindContent, () => css(false)));

exports.css = css;

/*
 * Javascript
 */

const js = () => Promise.all(rollupConfig.map(cfg => rollup.rollup(cfg)
    .then(bundle => bundle.write(cfg.output))));

const jsWatch = cb => {
    const watchers = rollupConfig.map(cfg => rollup.watch(cfg));
    watchers.forEach(watcher => {
        watcher.on('event', event => {
            if (event.code === 'ERROR') {
                console.error(event.error);
                event.result.close();
            } else if (event.code === 'BUNDLE_END') {
                event.result.close();
            }
        });
        watcher.on('close', cb);
    });
};

exports.js = js;

/*
 * Browsersync
 */

const serve = () => {
    const browserSync = require('browser-sync').create();
    browserSync.init({
        server: { baseDir: './dist' },
        watch: true,
        port: 8080,
        open: false,
        notify: false,
    });
};

/*
 * Build commands
 */

if (production) {
    exports.build = parallel(eleventyBuild, series(js, css));
    exports.serve = series(exports.build, serve);
} else {
    exports.build = parallel(eleventyBuild, css, js);
    exports.serve = parallel(eleventyWatch, jsWatch, scssWatch, postcssWatch, serve);
}
