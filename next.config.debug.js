
/** @type {import('next').NextConfig} */
const path = require('path');

/**
 * DEBUG 配置 - 用于诊断构建卡点
 * 
 * 使用方法：
 * 1. 备份原配置：copy next.config.js next.config.js.backup
 * 2. 使用此配置：copy next.config.debug.js next.config.js
 * 3. 运行构建：npm run build
 * 4. 构建成功后恢复：copy next.config.js.backup next.config.js
 * 
 * 诊断要点：
 * - swcMinify: false - 禁用 SWC 压缩，改用 Terser（如果 SWC 卡住）
 * - optimizeCss: false - 禁用 CSS 优化（如果 Critters 卡住）
 * - typescript.ignoreBuildErrors - 跳过类型检查加速
 * - eslint.ignoreDuringBuilds - 跳过 ESLint 加速
 */

const nextConfig = {
  output: 'standalone',
  
  // 禁用优化以加速构建和诊断卡点
  swcMinify: false,  // 使用 Terser 代替 SWC minifier
  
  experimental: {
    // 禁用可能导致卡顿的实验性功能
    optimizeCss: false,
  },
  
  // 跳过检查以加速
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 保持图片配置
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
  
  // 添加详细日志
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
