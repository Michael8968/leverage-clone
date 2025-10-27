/*
 data-migrate.js
 Simple migration helper that reads exported JSON files (e.g., from Firestore export)
 and writes to CloudBase collections.

 Usage:
   node data-migrate.js --src data/export/users.json --col users
   node data-migrate.js --dir data/export --map users=users,demand=demands
*/

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
require('dotenv').config();

const cloudbase = require('@cloudbase/node-sdk');
const argv = minimist(process.argv.slice(2));

const env = process.env.CLOUDBASE_ENV_ID;
const secretId = process.env.CLOUDBASE_SECRET_ID || process.env.TENCENTCLOUD_SECRET_ID || '';
const secretKey = process.env.CLOUDBASE_SECRET_KEY || process.env.TENCENTCLOUD_SECRET_KEY || '';

if (!env) {
  console.error('CLOUDBASE_ENV_ID missing in env');
  process.exit(2);
}

const app = cloudbase.init({ env, secretId, secretKey });
const db = app.database();

async function migrateFile(src, col) {
  if (!fs.existsSync(src)) {
    console.error('src file not found', src);
    return;
  }
  const data = JSON.parse(fs.readFileSync(src, 'utf8'));
  console.log('migrating', data.length, 'rows to', col);
  for (const row of data) {
    const id = row.uid || row.id || undefined;
    if (id) {
      await db.collection(col).doc(String(id)).set(row);
    } else {
      await db.collection(col).add(row);
    }
  }
  console.log('done', col);
}

(async ()=>{
  if (argv.src && argv.col) {
    await migrateFile(argv.src, argv.col);
    process.exit(0);
  }
  if (argv.dir && argv.map) {
    const mapStr = argv.map; // e.g. users=users,demands=demands
    const pairs = mapStr.split(',').map(s=>s.split('='));
    for (const [srcName, col] of pairs) {
      const src = path.join(argv.dir, srcName + '.json');
      await migrateFile(src, col);
    }
    process.exit(0);
  }
  console.log('Usage: node data-migrate.js --src <file> --col <collection>  OR --dir <dir> --map src=dest,src2=dest2');
})();
