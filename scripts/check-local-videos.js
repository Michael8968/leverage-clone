const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = 3099;
const videos = [
  '/videos/light-bg.mp4',
  '/videos/dark-bg.mp4',
  '/videos/gradient-bg.mp4'
];

const server = http.createServer((req, res) => {
  const safePath = path.normalize(req.url).replace(/^\.\./, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const range = req.headers.range;
    const contentType = 'video/mp4';
    res.setHeader('Content-Type', contentType);
    if (range) {
      const match = /^bytes=(\d+)-(\d+)?$/.exec(range);
      const start = match ? parseInt(match[1], 10) : 0;
      const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
      if (start >= stat.size) {
        res.statusCode = 416;
        res.end();
        return;
      }
      res.statusCode = 206;
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', String(end - start + 1));
      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Length', String(stat.size));
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  });
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Local static server started at http://127.0.0.1:${PORT}`);

  const check = (urlPath, opts = {}) => new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: urlPath,
      method: opts.method || 'HEAD',
      headers: opts.headers || {}
    };
    const req = http.request(options, (res) => {
      resolve({ url: `http://127.0.0.1:${PORT}${urlPath}`, statusCode: res.statusCode, headers: res.headers });
    });
    req.on('error', (e) => resolve({ url: `http://127.0.0.1:${PORT}${urlPath}`, error: e.message }));
    req.end();
  });

  const results = [];
  for (const v of videos) {
    const head = await check(v, { method: 'HEAD' });
    results.push({ type: 'HEAD', ...head });
    const range = await check(v, { method: 'GET', headers: { Range: 'bytes=0-1' } });
    results.push({ type: 'RANGE', ...range });
  }

  for (const r of results) {
    if (r.error) {
      console.log(`${r.type} ${r.url} -> ERROR: ${r.error}`);
    } else {
      const ct = r.headers && (r.headers['content-type'] || r.headers['Content-Type']);
      console.log(`${r.type} ${r.url} -> ${r.statusCode} ${ct || ''}`);
    }
  }

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
