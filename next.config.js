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
    
    // 显式配置路径别名，确保 Docker 构建时能正确解析
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
      '@/components': require('path').resolve(__dirname, 'src/components'),
      '@/lib': require('path').resolve(__dirname, 'src/lib'),
      '@/hooks': require('path').resolve(__dirname, 'src/hooks'),
      '@/store': require('path').resolve(__dirname, 'src/store'),
      '@/types': require('path').resolve(__dirname, 'src/types'),
      '@/utils': require('path').resolve(__dirname, 'src/utils'),
    // Firebase & Firestore removed post-migration. Aliases cleaned.
    };

    // 在客户端构建中屏蔽 Node 专用 SDK，避免引入 fs/net/tls 依赖
    if (!isServer) {
      config.resolve.alias['@cloudbase/node-sdk'] = false;
      
      // 确保 @cloudbase/js-sdk 在客户端被正确打包
      // 不要将其外部化，确保它被包含在客户端 bundle 中
      if (config.externals) {
        config.externals = config.externals.filter((external) => {
          if (typeof external === 'function') {
            return true; // Keep function externals
          }
          if (typeof external === 'string' && external.includes('@cloudbase/js-sdk')) {
            return false; // Remove @cloudbase/js-sdk from externals
          }
          return true;
        });
      }
      
      // 确保 @cloudbase/js-sdk 被正确解析和打包
      // 添加模块规则以确保正确处理
      if (!config.module) {
        config.module = {};
      }
      if (!config.module.rules) {
        config.module.rules = [];
      }
    }

    // Inject admin instrumentation only on server build.
    if (isServer) {
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        // Attach instrumentation BEFORE other server code executes.
        if (!entries['instrumentation/admin-origin']) {
          entries['instrumentation/admin-origin'] = path.resolve(__dirname, 'src/instrumentation/admin-origin.ts');
        }
        return entries;
      };
    }
    
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
    // Use TCB auth by default in production
    NEXT_PUBLIC_USE_TCB_AUTH: process.env.NEXT_PUBLIC_USE_TCB_AUTH || (isProd ? 'true' : 'false'),

    // --- Existing variables ---
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    // DO NOT expose Firebase Admin credentials to client/server bundle.
    // Access via process.env at runtime only if absolutely needed.
  },
  
  // 减少并发以降低内存压力 (preserved from original)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
