/** @type {import('next').NextConfig} */
const path = require('path');

/**
 * DEBUG 配置 - 用于诊断构建卡点
 * 
 * 诊断场景：
 * 1. Terser minify hang - swcMinify: false 使用 Terser
 * 2. SWC compile error - 禁用 SWC，或 downgrade @swc/core to 1.3.100
 * 3. CSS 优化卡住 - optimizeCss: false
 * 4. Turbopack 问题 - turbo: false
 * 5. 模块解析错误 - webpack fallback 忽略已卸载的包
 * 
 * 使用方法：
 * 1. 备份：copy next.config.js next.config.js.backup
 * 2. 应用：copy debug-next.config.js next.config.js
 * 3. 构建：npm run build
 * 4. 成功后恢复：copy next.config.js.backup next.config.js
 * 
 * 或使用脚本：npm run build:debug
 */

const nextConfig = {
  output: 'standalone',
  
  // 🔧 禁用 SWC minify（如果 Terser 卡住）
  // 改用 Terser（虽然慢，但更稳定）
  swcMinify: false,
  
  experimental: {
    // 🚫 禁用 Turbopack（如果启用会导致不稳定）
    turbo: false,
    
    // 🚫 禁用 CSS 优化（Critters 可能卡住在 "Finalizing page optimization"）
    optimizeCss: false,
    
    // 🚫 禁用包导入优化（减少模块解析复杂度）
    optimizePackageImports: [],
  },
  
  // 跳过检查以加速诊断
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Webpack 配置优化
  webpack: (config, { isServer, dev }) => {
    // 禁用缓存（避免缓存损坏导致的卡顿）
    config.cache = false;
    
    // 添加模块解析 fallback（忽略已卸载的依赖）
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // 这些包已从 package.json 移除，但可能仍被旧代码引用
      '@cloudbase/node-sdk': false,
      'tencentcloud-sdk-nodejs-hunyuan': false,
    };
    
    // 减少日志输出
    config.infrastructureLogging = {
      level: 'error', // 只显示错误
    };
    
    // 增加模块解析超时（防止复杂依赖树导致超时）
    config.stats = {
      warningsFilter: [
        /node_modules/,
        /Critical dependency/,
      ],
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
  
  // 减少并发以降低内存压力
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
