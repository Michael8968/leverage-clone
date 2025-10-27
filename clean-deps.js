#!/usr/bin/env node
/**
 * clean-deps.js
 * - 卸载不再使用的依赖
 * - 重新安装并修复锁文件
 */
const { spawnSync } = require('child_process');

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status);
}

const toUninstall = [
  '@cloudbase/node-sdk',
  'tencentcloud-sdk-nodejs-hunyuan'
];

run('npm', ['uninstall', ...toUninstall]);
run('npm', ['install', '--no-audit', '--no-fund']);

console.log('Dependencies cleaned successfully.');
