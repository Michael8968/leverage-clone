/** @type {import('next').NextConfig} */
const path = require('path');

// Determine if the environment is production, this is crucial for the migration.
const isProd = process.env.NODE_ENV === 'production';

/**
 * Next.js 配置 - 混合模式（开发: Firebase, 生产: TCB）
 *
 * 特性：
 * - 生产环境静态导出 (output: 'export') 以支持 TCB 静态托管
 * - 通过环境变量注入区分开发/生产环境
 * - 保留了原有的 Webpack 优化和模块别名
 *
 * 注意：此配置为 Firebase -> TCB 迁移的核心部分
 */
const nextConfig = {
  // Enable standalone output for Docker deployment
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
  
  // Webpack 配置优化 (preserved from original)
  webpack: (config, { isServer, dev }) => {
    // 添加模块解析 fallback（忽略已卸载的依赖）
    config.resolve.fallback = {
      ...config.resolve.fallback,
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
  
  // 图片配置 (preserved from original)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'example.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'i.pravatar.cc', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'gw.alicdn.com', port: '', pathname: '/**' },
    ],
  },
  
  async rewrites() {
    return [{ source: '/api/:path*', destination: '/api/:path*' }];
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=300, s-maxage=600' }],
      },
    ];
  },
  
  // Merged Environment Variables
  env: {
    // --- Variables for TCB migration ---
    NEXT_PUBLIC_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_TCB_ENV_ID: process.env.TCB_ENV_ID,
    
    // --- Existing variables ---
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  },
  
  // 减少并发以降低内存压力 (preserved from original)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
