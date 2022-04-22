const fs = require('fs');
const { parse } = require('url');
const crypto = require('crypto');

module.exports.hash = str => crypto.createHash('md5').update(str).digest('hex');

module.exports.download = async (url, filePath) => {
    let { protocol, href } = parse(url);
    let http = protocol === 'https:' ? require('https') : require('http');
    let fileStream = fs.createWriteStream(filePath);
    return new Promise((resolve, reject) => {
        http.get(href, res => {
            if (res.statusCode >= 400)
                reject(res.statusMessage);
            res.on('data', chunk => fileStream.write(chunk));
            res.on('abort', () => {
                fs.unlink(filePath, err => {
                    if (err) reject(err);
                    else reject(new Error(`Download aborted: failed to download from ${url}`));
                });
            });
            res.on('error', reject);
            res.on('end', () =>
                fileStream.end(resolve));
        });
    });
};

module.exports.mkdir = (...dirs) => {
    let tasks = dirs.map(async dir => {
        try {
            await fs.promises.access(dir);
        } catch (e) {
            if (e.code !== 'ENOENT')
                throw e;
            await fs.promises.mkdir(dir, { recursive: true });
        }
    });
    return Promise.all(tasks);
};
