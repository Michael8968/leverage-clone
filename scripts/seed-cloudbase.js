#!/usr/bin/env node
/*
 seed-cloudbase.js
 Usage:
   node scripts/seed-cloudbase.js --dry-run
   node scripts/seed-cloudbase.js --push

 This script reads data/*.json and either prints summary (--dry-run)
 or writes to CloudBase using @cloudbase/node-sdk (--push).
 It reads CLOUDBASE_ENV_ID and HTTP API KEY from .env or process.env.
*/

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
require('dotenv').config();

const argv = minimist(process.argv.slice(2));
const dryRun = argv['dry-run'] || argv.dry || false;
const push = argv.push || false;

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadJson(name) {
  const p = path.join(DATA_DIR, name);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function main() {
  const envId = process.env.CLOUDBASE_ENV_ID;
  const apiKey = process.env.CLOUDBASE_HTTP_API_KEY || process.env.CLOUDBASE_API_KEY;

  const users = loadJson('users.json');
  const demands = loadJson('demands.json');
  const suppliers = loadJson('suppliers.json');
  const products = loadJson('products.json');
  const prompts = loadJson('prompts.json');

  console.log('CloudBase Env ID:', envId || '(not set)');
  console.log('HTTP API Key:', apiKey ? '***REDACTED***' : '(not set)');

  console.log('Summary:');
  console.log(' users:', users.length);
  console.log(' demands:', demands.length);
  console.log(' suppliers:', suppliers.length);
  console.log(' products:', products.length);
  console.log(' prompts:', prompts.length);

  if (dryRun) {
    console.log('\nDry-run complete. No changes made.');
    return;
  }

  if (!push) {
    console.log('\nNo --push flag supplied. Add --push to perform the write.');
    process.exit(0);
  }

  if (!envId || !apiKey) {
    console.error('CLOUDBASE_ENV_ID or HTTP API KEY missing in environment. Aborting.');
    process.exit(2);
  }

  // Lazy require to avoid installing when not used
  const cloudbase = require('@cloudbase/node-sdk');

  const secretId = process.env.CLOUDBASE_SECRET_ID || process.env.TENCENTCLOUD_SECRET_ID || '';
  const secretKey = process.env.CLOUDBASE_SECRET_KEY || process.env.TENCENTCLOUD_SECRET_KEY || '';

  const app = cloudbase.init({
    env: envId,
    secretId: secretId,
    secretKey: secretKey,
    // If secretId/secretKey are empty, SDK will fail for admin write operations.
  });

  const db = app.database();

  async function writeCollection(name, items, idField) {
    console.log(`Writing ${items.length} docs to collection '${name}'...`);
    for (const it of items) {
      const docId = idField && it[idField] ? String(it[idField]) : undefined;
      try {
        if (docId) {
          const res = await db.collection(name).doc(docId).set(it);
          console.log(`  OK set ${name}/${docId}`, res || 'no-res');
        } else {
          const res = await db.collection(name).add(it);
          console.log(`  OK add ${name} -> id=${res.id || JSON.stringify(res)}`);
        }
      } catch (err) {
        console.error('Failed to write', name, docId || '(new)', err && err.message || err);
      }
    }
  }

  // perform writes
  await writeCollection('users', users, 'uid');
  await writeCollection('demands', demands, 'id');
  await writeCollection('suppliers', suppliers, 'id');
  await writeCollection('products', products, 'id');
  await writeCollection('prompts', prompts, 'id');

  console.log('Seed complete.');
}

main().catch(err => {
  console.error('Unexpected error:', err && err.stack || err);
  process.exit(1);
});
