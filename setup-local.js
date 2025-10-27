/*
setup-local.js
- simulate-db: 将 data/*.json 文件写入本地模拟 Firestore（这里只写示例：将 JSON 文件打印或可扩展为写入本地小型 DB）
- test-local: 运行简单的本地检查（如读取 data/users.json 并验证必需字段）

使用方法:
  node setup-local.js simulate-db
  node setup-local.js test-local

*/

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATA_DIR = path.join(__dirname, 'data');

function loadJson(filename) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function simulateDb() {
  const users = loadJson('users.json') || [];
  const demands = loadJson('demands.json') || [];
  const suppliers = loadJson('suppliers.json') || [];
  const products = loadJson('products.json') || [];
  const prompts = loadJson('prompts.json') || [];

  console.log('CLOUDBASE_ENV_ID=', process.env.CLOUDBASE_ENV_ID || '(not set)');
  console.log('Loaded users:', users.length);
  console.log('Loaded demands:', demands.length);
  console.log('Loaded suppliers:', suppliers.length);
  console.log('Loaded products:', products.length);
  console.log('Loaded prompts:', prompts.length);

  // 可扩展：把数据写入本地小 DB 或调用 CloudBase SDK 写入测试环境
}

function testLocal() {
  const users = loadJson('users.json') || [];
  if (users.length === 0) {
    console.error('No users found in data/users.json');
    process.exitCode = 2;
    return;
  }
  const missing = users.filter(u => !u.uid || !u.email);
  if (missing.length) {
    console.error('Some users missing uid or email:', missing);
    process.exitCode = 3;
    return;
  }
  console.log('Basic local tests passed. Sample user:', users[0].uid);
}

const cmd = process.argv[2];
if (!cmd) {
  console.log('Usage: node setup-local.js <simulate-db|test-local>');
  process.exitCode = 1;
}

if (cmd === 'simulate-db') simulateDb();
else if (cmd === 'test-local') testLocal();
else {
  console.log('Unknown command:', cmd);
  process.exitCode = 1;
}
