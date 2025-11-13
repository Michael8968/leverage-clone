#!/usr/bin/env node

/**
 * 部署前验证脚本 - 检查视频静态文件和 SSR 渲染
 * 用于本地开发和 CI/CD 流水线，确保 TCB 部署时视频可用
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * 发送 HTTP 请求
 */
function makeRequest(url, method = 'HEAD') {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;

    const req = client.request(url, { method }, (res) => {
      resolve({
        status: res.status,
        headers: res.headers,
        url
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Request timeout')));
    req.end();
  });
}

/**
 * 检查视频文件是否可访问
 */
async function checkVideoFiles() {
  console.log('🔍 检查视频静态文件...');

  const videos = ['light-bg.mp4', 'dark-bg.mp4', 'gradient-bg.mp4'];
  const results = [];

  for (const video of videos) {
    const url = `${BASE_URL}/videos/${video}`;
    try {
      const res = await makeRequest(url);
      const success = res.status === 200;
      results.push({ video, url, status: res.status, success });
      console.log(`  ${success ? '✅' : '❌'} ${video}: ${res.status}`);
    } catch (error) {
      results.push({ video, url, error: error.message, success: false });
      console.log(`  ❌ ${video}: ${error.message}`);
    }
  }

  return results;
}

/**
 * 检查登录页 SSR 渲染的视频 src
 */
async function checkLoginPageVideoSrc() {
  console.log('🔍 检查登录页视频 src...');

  try {
    const res = await makeRequest(`${BASE_URL}/login`, 'GET');
    if (res.status !== 200) {
      throw new Error(`登录页返回 ${res.status}`);
    }

    // 这里简化，实际需要解析 HTML
    // 由于 Node.js 没有 DOM 解析器，我们用正则简单检查
    const html = await getFullResponse(`${BASE_URL}/login`);
    const match = html.match(/<source[^>]*src="([^"]*videos\/[^"]*\.mp4)"/);

    if (match) {
      const src = match[1];
      const isRelative = src.startsWith('/videos/');
      console.log(`  ${isRelative ? '✅' : '❌'} 视频 src: ${src}`);
      return { src, isRelative, success: isRelative };
    } else {
      console.log('  ❌ 未找到视频 source 标签');
      return { success: false, error: 'No video source found' };
    }
  } catch (error) {
    console.log(`  ❌ 检查失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 获取完整响应体
 */
function getFullResponse(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;

    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('Request timeout')));
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始部署前验证...\n');

  try {
    // 检查视频文件
    const videoResults = await checkVideoFiles();
    const videoSuccess = videoResults.every(r => r.success);

    console.log('');

    // 检查登录页
    const loginResult = await checkLoginPageVideoSrc();

    console.log('');

    // 总结
    const allSuccess = videoSuccess && loginResult.success;

    if (allSuccess) {
      console.log('🎉 所有检查通过！可以安全部署到 TCB。');
      process.exit(0);
    } else {
      console.log('❌ 检查失败！请修复以下问题后再部署：');
      if (!videoSuccess) {
        console.log('  - 视频文件不可访问');
      }
      if (!loginResult.success) {
        console.log('  - 登录页视频 src 不正确');
      }
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 验证脚本执行失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkVideoFiles, checkLoginPageVideoSrc };