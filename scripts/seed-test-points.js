#!/usr/bin/env node
// Seed a minimal points_transactions record for test-ai-flow strict checks
const path = require('path');
const dotenv = require('dotenv');
// Load .env first
dotenv.config();
// Fallback to .env.local if CLOUDBASE env still missing
if (!process.env.CLOUDBASE_ENV_ID && !process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID) {
  dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
}

async function main() {
  const cloudbase = require('@cloudbase/node-sdk');
  const env = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
  const secretId = process.env.TENCENTCLOUD_SECRET_ID || process.env.CLOUDBASE_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY || process.env.CLOUDBASE_SECRET_KEY;
  if (!env || !secretId || !secretKey) {
    console.error('Missing CLOUDBASE env/secret. Please set CLOUDBASE_ENV_ID and secretId/secretKey.');
    process.exit(2);
  }
  const app = cloudbase.init({ env, secretId, secretKey });
  const db = app.database();
  const col = db.collection('points_transactions');

  // Ensure collection exists (create if missing)
  if (typeof db.createCollection === 'function') {
    try {
      await db.createCollection('points_transactions');
      console.log('Created collection points_transactions');
    } catch (e) {
      // ignore if already exists
      if (!String(e?.message || e).includes('already exists')) {
        console.warn('createCollection warning:', e?.message || e);
      }
    }
  }

  const uid = process.argv[2] || 'test1';
  const amount = Number(process.argv[3] || -10);
  const reason = process.argv[4] || 'seed for test-ai-flow';

  // upsert: if no doc for uid exists, add one
  const existing = await col.where({ uid }).limit(1).get();
  if (existing && existing.data && existing.data.length > 0) {
    console.log(`points_transactions already has a record for uid=${uid}. Skipping insert.`);
  } else {
    const doc = {
      uid,
      amount,
      reason,
      createdAt: new Date(),
    };
    const res = await col.add(doc);
    console.log('Inserted points_transactions doc id:', res.id || JSON.stringify(res));
  }
}

main().catch((e) => {
  console.error('Seed failed:', e?.message || e);
  process.exit(1);
});
