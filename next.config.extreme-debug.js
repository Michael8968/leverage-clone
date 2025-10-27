/** @type {import('next').NextConfig} */
const path = require('path');

/**
 * EXTREME DEBUG 配置 - 用于诊断严重的构建卡点
 * 
 * 此配置禁用所有可能导致卡顿的优化：
 * - swcMinify: false - 使用 Terser 替代 SWC
 * - turbo: false - 禁用 Turbopack（如果启用）
 * - optimizeCss: false - 禁用 Critters CSS 优化
 * - 跳过所有静态检查（TypeScript/ESLint）
 * 
 * 使用场景：
 * - SWC 编译器崩溃（Segmentation fault）
 * - Terser 压缩卡住 > 5 分钟
 * - Critters CSS 优化无响应
 * - 模块解析死循环
 * 
 * 使用方法：
 * 1. 备份：copy next.config.js next.config.js.backup
 * 2. 应用：copy next.config.extreme-debug.js next.config.js
 * 3. 构建：npm run build
 * 4. 恢复：copy next.config.js.backup next.config.js
 */

const nextConfig = {
  output: 'standalone',
  
  // 禁用所有压缩优化
  swcMinify: false,         // 使用 Terser（更稳定但更慢）
  compress: false,          // 禁用 webpack 压缩
  
  experimental: {
    turbo: false,           // 禁用 Turbopack（如果启用会导致不稳定）
    optimizeCss: false,     // 禁用 CSS 优化（Critters 可能卡住）
    optimizePackageImports: [], // 禁用包优化
  },
  
  // 跳过所有静态检查
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 优化 webpack 配置
  webpack: (config, { isServer }) => {
    // 禁用 webpack 缓存（避免缓存损坏）
    config.cache = false;
    
    // 增加模块解析超时
    config.infrastructureLogging = {
      level: 'error',
    };
    
    // 忽略可能缺失的模块
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@cloudbase/node-sdk': false,
      'tencentcloud-sdk-nodejs-hunyuan': false,
    };
    
    return config;
  },
  
  // 图片配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gw.alicdn.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  async rewrites() {
    return [
      { source: '/api/:path*', destination: '/api/:path*' }
    ]
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=600',
          },
        ],
      },
    ]
  },
  
  env: {
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  },
  
  // 减少并发以降低内存使用
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
