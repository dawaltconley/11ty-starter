const yaml = require('js-yaml');
const dayjs = require('dayjs');
const loremIpsum = require('fast-lorem-ipsum');
const frontMatter = require('gray-matter');
const nunjucksDo = require('nunjucks-do');

const header = require('@dawaltconley/header-basic');
const Icons = require('@dawaltconley/media-icons');

const markdown = require('markdown-it')({
    typographer: true,
    html: true,
});
const frontMatterConfig = {
    excerpt: true,
    excerpt_separator: '<!-- more -->'
};

module.exports = eleventyConfig => {

    // add YAML support
    eleventyConfig.addDataExtension('yml', data => yaml.load(data));
    eleventyConfig.addDataExtension('yaml', data => yaml.load(data));

    // custom markdown
    eleventyConfig.setLibrary('md', markdown);
    eleventyConfig.addFilter('markdownify', str => markdown.render(str));
    eleventyConfig.addFilter('frontmatter', data => frontMatter(data, frontMatterConfig));
    eleventyConfig.setFrontMatterParsingOptions(frontMatterConfig);

    // basic filters
    eleventyConfig.addFilter('date', (date, format) => dayjs(date).format(format));
    eleventyConfig.addFilter('jsonify', data => JSON.stringify(data));
    eleventyConfig.addNunjucksTag('do', nunjucksDo);
    eleventyConfig.addShortcode('lorem', loremIpsum);

    // logic filters
    eleventyConfig.addFilter('merge', (obj1, obj2) => Object.assign(obj1, obj2));
    eleventyConfig.addFilter('map', (arr, prop) => arr.map(a => a[prop]));
    eleventyConfig.addFilter('where', (arr, ...args) => {
        const operations = {
            'undefined': a => a[prop],
            '==':  a => a[prop] == value,
            '!=':  a => a[prop] != value,
            '===': a => a[prop] === value,
            '!==': a => a[prop] !== value,
            '>':   a => a[prop] > value,
            '>=':  a => a[prop] >= value,
            '<':   a => a[prop] < value,
            '<=':  a => a[prop] <= value,
        };
        let [ prop, operator, value ] = args;
        if (operator !== undefined && value === undefined) {
            value = operator;
            operator = '==';
        }
        let test = operations[operator];
        if (!test)
            throw new Error(`bad operator in 'where' filter: ${operator}`);
        return arr.filter(test);
    });

    // plugins
    eleventyConfig.addPlugin(header.eleventy);
    eleventyConfig.addPlugin(Icons.eleventy);

    // pass through site assets
    eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

    return {
        dir: {
            input: 'src',
            output: 'dist',
            includes: '_includes',
            data: '_data',
        },
        dataTemplateEngine: 'njk',
        markdownTemplateEngine: 'njk',
        htmlTemplateEngine: 'njk',
    };
};
