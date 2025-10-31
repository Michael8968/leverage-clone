#!/usr/bin/env node
const https = require('https');
const bucket = process.env.COS_BUCKET;
const region = process.env.COS_REGION || 'ap-shanghai';
if (!bucket) { console.error('Please set COS_BUCKET'); process.exit(2); }
const files = ['light-bg.mp4','dark-bg.mp4','gradient-bg.mp4','gradient-bg1.mp4'];

function head(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = https.request({ method: 'HEAD', hostname: u.hostname, path: u.pathname, port: 443 }, (res) => {
      resolve({ status: res.statusCode, contentType: res.headers['content-type'] });
    });
    req.on('error', (e) => { resolve({ error: e.message }); });
    req.end();
  });
}

function range(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = https.request({ method: 'GET', hostname: u.hostname, path: u.pathname, port: 443, headers: { Range: 'bytes=0-1023' } }, (res) => {
      resolve({ status: res.statusCode, contentType: res.headers['content-type'] });
      res.on('data', () => {});
    });
    req.on('error', (e) => { resolve({ error: e.message }); });
    req.end();
  });
}

(async () => {
  for (const f of files) {
    const url = `https://${bucket}.cos.${region}.myqcloud.com/videos/${f}`;
    console.log('\nChecking', url);
    const h = await head(url);
    console.log(' HEAD', h.status || '', h.contentType || h.error || '');
    const r = await range(url);
    console.log(' RANGE', r.status || '', r.contentType || r.error || '');
  }
})();
