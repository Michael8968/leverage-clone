/** @type {import('next').NextConfig} */
const path = require('path');

/**
 * Next.js 配置 - 生产环境优化版本
 * 
 * 特性：
 * - Standalone 输出模式（用于 Docker 部署）
 * - 优化的构建性能
 * - 兼容 Windows 环境
 * - 模块解析 fallback（忽略已卸载的遗留依赖）
 * 
 * 注意：如果遇到构建问题，可使用 debug-next.config.js 诊断
 */

const nextConfig = {
  output: 'standalone',
  
  experimental: {
    // 禁用 CSS 优化（避免 Critters 卡顿）
    optimizeCss: false,
    
    // 禁用包导入优化（减少模块解析复杂度）
    optimizePackageImports: [],
  },
  
  // 跳过静态检查以加速构建（生产环境可改为 false）
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Webpack 配置优化
  webpack: (config, { isServer, dev }) => {
    // 添加模块解析 fallback（忽略已卸载的依赖）
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // 这些包已从 package.json 移除，但可能仍被旧代码引用
      '@cloudbase/node-sdk': false,
      'tencentcloud-sdk-nodejs-hunyuan': false,
    };
    // 将 Firestore 运行时映射到我们的 CloudBase 兼容层
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'firebase/firestore': require('path').resolve(__dirname, 'src/lib/cloudbase-compat.ts'),
    };
    
    // 减少构建日志噪音
    if (!dev) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    
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
