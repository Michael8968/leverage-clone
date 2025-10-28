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
  { key: 'public/videos', ok: (
      // Accept either .deploy/public/videos/* or .deploy/videos/* depending on how files were copied
      (exists(path.join(root, 'public', 'videos', 'light-bg.mp4')) && exists(path.join(root, 'public', 'videos', 'dark-bg.mp4')) && (exists(path.join(root, 'public', 'videos', 'gradient-bg.mp4')) || exists(path.join(root, 'public', 'videos', 'gradient-bg1.mp4'))))
      ||
      (exists(path.join(root, 'videos', 'light-bg.mp4')) && exists(path.join(root, 'videos', 'dark-bg.mp4')) && (exists(path.join(root, 'videos', 'gradient-bg.mp4')) || exists(path.join(root, 'videos', 'gradient-bg1.mp4'))))
    ) },
];

let allOk = true;
for (const c of checks) {
  console.log(`- ${c.key}: ${c.ok ? 'FOUND' : 'MISSING'}`);
  if (!c.ok) allOk = false;
}

if (!allOk) {
  console.error('\nOne or more required items are missing from the deploy artifact.');
  console.error('If `public/videos` is missing, ensure your deploy process copies the `public` directory (or use the provided scripts/ci/tencent-build.sh to prepare a .deploy containing public/).');
  process.exit(2);
}

console.log('\nDeploy artifact looks OK.');
process.exit(0);
