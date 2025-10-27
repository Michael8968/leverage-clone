require('dotenv').config();
const http = require('http');
const net = require('net');

async function waitForPort(port, host = '127.0.0.1', timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = new net.Socket();
      let settled = false;
      const settle = (fn) => {
        if (!settled) {
          settled = true;
          socket.destroy();
          fn();
        }
      };
      socket.setTimeout(1000);
      socket.once('connect', () => settle(() => resolve(true)));
      socket.once('timeout', () => settle(() => retry()));
      socket.once('error', () => settle(() => retry()));
      socket.connect(port, host);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for server on ${host}:${port}`));
      } else {
        setTimeout(attempt, 500);
      }
    };
    attempt();
  });
}

(async () => {
  try {
    // 模拟 wx.login，直接给定一个 userId
    const userId = 'test1';
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  const payload = JSON.stringify({ prompt: '你好，测试一下执行', userId });
  await waitForPort(port, '127.0.0.1', 30000);
    const req = http.request({
      hostname: 'localhost',
      port,
      path: '/api/executePrompt',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('executePrompt response:', data);
      });
    });
    req.on('error', (e) => console.error('request error:', e));
    req.write(payload);
    req.end();
  } catch (e) {
    console.error('test-mini error:', e);
    process.exit(1);
  }
})();
