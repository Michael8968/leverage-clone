#!/usr/bin/env node

/**
 * 静态文件验证脚本 - 专门验证视频文件加载
 */

const https = require('https');
const http = require('http');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`${BLUE}=== 静态文件验证 ===${RESET}\n`);

// 生产环境URL
const BASE_URL = 'https://leverage-test-abc123-9bn41a84185.app.tcloudbase.com';

// 要验证的视频文件
const videoFiles = [
  '/videos/light-bg.mp4',
  '/videos/dark-bg.mp4',
  '/videos/gradient-bg.mp4'
];

async function checkStaticFile(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;

    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        url,
        status: res.statusCode,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length'],
        success: res.statusCode === 200
      });
    });

    req.on('error', (err) => {
      resolve({
        url,
        status: null,
        error: err.message,
        success: false
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url,
        status: null,
        error: '请求超时',
        success: false
      });
    });

    req.end();
  });
}

async function validateStaticFiles() {
  console.log(`${YELLOW}检查静态文件服务...${RESET}\n`);

  const results = [];

  // 检查首页
  console.log(`${YELLOW}1. 检查首页访问${RESET}`);
  const homeResult = await checkStaticFile(BASE_URL);
  results.push({ name: '首页访问', ...homeResult });

  if (homeResult.success) {
    console.log(`  ${GREEN}✓${RESET} 首页可访问 (状态: ${homeResult.status})`);
  } else {
    console.log(`  ${RED}✗${RESET} 首页不可访问 (错误: ${homeResult.error || '未知错误'})`);
  }
  console.log();

  // 检查视频文件
  console.log(`${YELLOW}2. 检查视频文件${RESET}`);
  for (const videoPath of videoFiles) {
    const fullUrl = BASE_URL + videoPath;
    console.log(`  检查: ${videoPath}`);

    const result = await checkStaticFile(fullUrl);
    results.push({ name: `视频文件: ${videoPath}`, ...result });

    if (result.success) {
      console.log(`    ${GREEN}✓${RESET} 可访问 (状态: ${result.status}, 大小: ${result.contentLength || '未知'} bytes)`);
      if (result.contentType) {
        console.log(`      Content-Type: ${result.contentType}`);
      }
    } else {
      console.log(`    ${RED}✗${RESET} 不可访问 (错误: ${result.error || '未知错误'})`);
    }
    console.log();
  }

  // 检查其他静态资源
  console.log(`${YELLOW}3. 检查其他静态资源${RESET}`);
  const staticFiles = [
    '/favicon.ico',
    '/_next/static/css/app/layout.css',
    '/_next/static/js/app/page.js'
  ];

  for (const staticPath of staticFiles) {
    const fullUrl = BASE_URL + staticPath;
    console.log(`  检查: ${staticPath}`);

    const result = await checkStaticFile(fullUrl);
    results.push({ name: `静态文件: ${staticPath}`, ...result });

    if (result.success) {
      console.log(`    ${GREEN}✓${RESET} 可访问 (状态: ${result.status})`);
    } else {
      console.log(`    ${YELLOW}⚠${RESET} 不可访问 (可能正常: ${result.error || '未知错误'})`);
    }
  }
  console.log();

  // 总结
  const successful = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`${BLUE}=== 验证结果 ===${RESET}`);
  console.log(`成功: ${successful}/${total} (${Math.round(successful/total*100)}%)`);
  console.log();

  if (successful === total) {
    console.log(`${GREEN}✅ 所有静态文件验证通过！${RESET}`);
    console.log(`${GREEN}视频文件应该能正常加载。${RESET}`);
  } else {
    const failedVideos = results.filter(r => r.name.includes('视频文件') && !r.success);
    if (failedVideos.length > 0) {
      console.log(`${RED}❌ 视频文件验证失败！${RESET}`);
      console.log(`${YELLOW}可能原因:${RESET}`);
      console.log(`  1. Docker 容器未正确复制 public 目录`);
      console.log(`  2. TCB 静态文件服务配置问题`);
      console.log(`  3. 部署包中缺少视频文件`);
      console.log(`  4. 文件权限问题`);
    } else {
      console.log(`${YELLOW}⚠️ 部分静态文件验证失败，但视频文件正常。${RESET}`);
    }
  }

  console.log();
  console.log(`${BLUE}故障排除建议:${RESET}`);
  console.log(`1. 检查 TCB 控制台 → 静态网站设置`);
  console.log(`2. 确认 Docker 容器中存在 /app/public/videos/ 目录`);
  console.log(`3. 验证部署包包含视频文件`);
  console.log(`4. 检查浏览器开发者工具的 Network 标签`);

  process.exit(successful === total ? 0 : 1);
}

validateStaticFiles().catch(err => {
  console.error(`${RED}验证脚本执行失败:${RESET}`, err.message);
  process.exit(1);
});