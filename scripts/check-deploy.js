const fs = require('fs');
const path = require('path');

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch (e) {
    return false;
  }
}

const target = process.argv[2] || '.deploy';
const root = path.resolve(process.cwd(), target);

console.log('Checking deploy artifact:', root);

const checks = [
  { key: 'node', ok: exists(path.join(root, 'node')) || exists(path.join(root, 'node.exe')) },
  { key: '@cloudbase/node-sdk', ok: exists(path.join(root, 'node_modules', '@cloudbase', 'node-sdk')) },
  { key: 'next-standalone', ok: exists(path.join(root, 'server.js')) || exists(path.join(root, '.next')) },
];

let allOk = true;
for (const c of checks) {
  console.log(`- ${c.key}: ${c.ok ? 'FOUND' : 'MISSING'}`);
  if (!c.ok) allOk = false;
}

if (!allOk) {
  console.error('\nOne or more required items are missing from the deploy artifact.');
  process.exit(2);
}

console.log('\nDeploy artifact looks OK.');
process.exit(0);
