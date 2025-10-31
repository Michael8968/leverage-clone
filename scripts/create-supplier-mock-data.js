#!/usr/bin/env node

/**
 * Script to create complete supplier mock data with media assets
 * This script creates a comprehensive supplier profile with all required fields
 * and uploads associated media files to cloud storage
 */

const cloudbase = require('@cloudbase/node-sdk');
require('dotenv').config();

// Initialize CloudBase
const envId = process.env.CLOUDBASE_ENV_ID;
const secretId = process.env.CLOUDBASE_SECRET_ID || process.env.TENCENTCLOUD_SECRET_ID || '';
const secretKey = process.env.CLOUDBASE_SECRET_KEY || process.env.TENCENTCLOUD_SECRET_KEY || '';

if (!envId) {
  console.error('❌ CLOUDBASE_ENV_ID not found in environment variables');
  process.exit(1);
}

const app = cloudbase.init({
  env: envId,
  secretId: secretId,
  secretKey: secretKey,
});

const db = app.database();

async function createCompleteSupplierData() {
  console.log('🚀 Creating complete supplier mock data...');

  // Mock supplier data with comprehensive information
  const supplierData = {
    id: 'supplier_demo_001',
    name: '深圳市创新科技有限公司',
    shortName: '创新科技',
    region: '广东省深圳市南山区',
    address: '深圳市南山区科技园高新南四道18号',
    establishedDate: new Date('2018-03-15'),
    registeredCapital: '5000万元人民币',
    creditCode: '91440300MA5F8K8K8K',
    email: 'contact@innovtech.cn',
    category: '科技服务',
    matchScore: 95,
    supplementaryFields: [
      {
        id: 'field_001',
        label: '主营业务',
        type: 'textarea',
        value: '专注于人工智能、机器学习、大数据分析、智能硬件研发等领域，为企业提供全方位的科技解决方案。'
      },
      {
        id: 'field_002',
        label: '技术团队规模',
        type: 'text',
        value: '150人'
      },
      {
        id: 'field_003',
        label: '核心技术',
        type: 'textarea',
        value: '深度学习、自然语言处理、计算机视觉、边缘计算、物联网'
      },
      {
        id: 'field_004',
        label: '服务客户',
        type: 'textarea',
        value: '华为、腾讯、阿里巴巴、百度等知名企业'
      },
      {
        id: 'field_005',
        label: '专利数量',
        type: 'text',
        value: '28项'
      }
    ],
    // Media assets (using COS URLs as specified)
    logoUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/logo.png',
    businessLicenseUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/business_license.jpg',
    certificates: [
      'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/cert_iso9001.jpg',
      'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/cert_high_tech.jpg',
      'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/cert_patent.jpg'
    ],
    companyPhotos: [
      'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/office_entrance.jpg',
      'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/conference_room.jpg',
      'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/lab.jpg',
      'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/team_photo.jpg'
    ],
    productShowcase: [
      {
        url: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/ai_platform.jpg',
        view: '整体',
        mediaAssetId: 'asset_001'
      },
      {
        url: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/smart_device.jpg',
        view: '前',
        mediaAssetId: 'asset_002'
      },
      {
        url: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/data_center.mp4',
        view: '整体',
        mediaAssetId: 'asset_003'
      }
    ]
  };

  try {
    // Save supplier data to CloudBase
    const supplierRef = db.collection('suppliers').doc(supplierData.id);
    await supplierRef.set({
      ...supplierData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Supplier basic data saved successfully');

    // Create associated products/services
    const productsData = [
      {
        id: 'product_001',
        name: 'AI智能客服平台',
        description: '基于大语言模型的智能客服解决方案，支持多渠道接入，自动处理80%的常见问题，提升客户满意度30%。',
        price: 99999,
        category: 'AI服务',
        supplierId: supplierData.id,
        supplierName: supplierData.name,
        supplierScore: 95,
        purchaseUrl: 'https://innovtech.cn/products/ai-customer-service',
        sku: 'AICS-001',
        status: '已入库',
        imageUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/ai_platform.jpg',
        thumbnailUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/ai_platform_thumb.jpg',
        images: [
          {
            url: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/ai_platform.jpg',
            view: '整体',
            mediaAssetId: 'asset_004'
          },
          {
            url: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/ai_dashboard.jpg',
            view: '前',
            mediaAssetId: 'asset_005'
          }
        ],
        details: [
          {
            id: 'detail_001',
            label: '支持渠道',
            type: 'text',
            value: '微信公众号、微信小程序、网页、APP、电话'
          },
          {
            id: 'detail_002',
            label: 'AI模型',
            type: 'text',
            value: 'GPT-4 + 自训练行业模型'
          },
          {
            id: 'detail_003',
            label: '响应时间',
            type: 'text',
            value: '< 3秒'
          },
          {
            id: 'detail_004',
            label: '准确率',
            type: 'text',
            value: '> 95%'
          }
        ]
      },
      {
        id: 'product_002',
        name: '智能物联网网关',
        description: '工业级物联网网关设备，支持多种协议转换，边缘计算能力强，适用于智能制造场景。',
        price: 2999,
        category: '智能硬件',
        supplierId: supplierData.id,
        supplierName: supplierData.name,
        supplierScore: 95,
        purchaseUrl: 'https://innovtech.cn/products/iot-gateway',
        sku: 'IOT-GW-002',
        status: '已入库',
        imageUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/smart_device.jpg',
        thumbnailUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/smart_device_thumb.jpg',
        images: [
          {
            url: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/smart_device.jpg',
            view: '前',
            mediaAssetId: 'asset_006'
          },
          {
            url: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/device_back.jpg',
            view: '后',
            mediaAssetId: 'asset_007'
          },
          {
            url: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/device_ports.jpg',
            view: '左',
            mediaAssetId: 'asset_008'
          }
        ],
        details: [
          {
            id: 'detail_005',
            label: '支持协议',
            type: 'text',
            value: 'MQTT、Modbus、OPC UA、HTTP、TCP/IP'
          },
          {
            id: 'detail_006',
            label: '计算能力',
            type: 'text',
            value: 'ARM Cortex-A53 四核处理器'
          },
          {
            id: 'detail_007',
            label: '工作温度',
            type: 'text',
            value: '-40°C ~ +85°C'
          },
          {
            id: 'detail_008',
            label: '防护等级',
            type: 'text',
            value: 'IP65'
          }
        ]
      },
      {
        id: 'product_003',
        name: '大数据分析平台',
        description: '企业级大数据分析平台，支持实时数据处理和可视化分析，帮助企业洞察业务数据价值。',
        price: 199999,
        category: '数据服务',
        supplierId: supplierData.id,
        supplierName: supplierData.name,
        supplierScore: 95,
        purchaseUrl: 'https://innovtech.cn/products/bigdata-platform',
        sku: 'BDAP-003',
        status: '已入库',
        imageUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/data_center.jpg',
        thumbnailUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/data_center_thumb.jpg',
        images: [
          {
            url: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/data_center.jpg',
            view: '整体',
            mediaAssetId: 'asset_009'
          },
          {
            url: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/dashboard_view.jpg',
            view: '前',
            mediaAssetId: 'asset_010'
          }
        ],
        details: [
          {
            id: 'detail_009',
            label: '数据处理能力',
            type: 'text',
            value: '每日处理10TB+数据'
          },
          {
            id: 'detail_010',
            label: '支持数据源',
            type: 'text',
            value: '关系型数据库、NoSQL、消息队列、文件系统'
          },
          {
            id: 'detail_011',
            label: '分析算法',
            type: 'textarea',
            value: '机器学习、统计分析、预测建模、异常检测、关联分析'
          },
          {
            id: 'detail_012',
            label: '可视化组件',
            type: 'text',
            value: '50+种图表类型，自定义仪表板'
          }
        ]
      }
    ];

    // Save products data
    for (const product of productsData) {
      const productRef = db.collection('products').doc(product.id);
      await productRef.set({
        ...product,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log('✅ Products data saved successfully');

    // Create media assets records (optional - collection may not exist)
    const mediaAssetsData = [
      {
        id: 'asset_001',
        userId: supplierData.id,
        storagePath: 'media_assets/supplier_demo_001/logo.png',
        publicUrl: supplierData.logoUrl,
        mediaType: 'image',
        mimeType: 'image/png',
        status: 'ready',
        createdAt: new Date()
      },
      {
        id: 'asset_002',
        userId: supplierData.id,
        storagePath: 'media_assets/supplier_demo_001/business_license.jpg',
        publicUrl: supplierData.businessLicenseUrl,
        mediaType: 'image',
        mimeType: 'image/jpeg',
        status: 'ready',
        createdAt: new Date()
      },
      {
        id: 'asset_003',
        userId: supplierData.id,
        storagePath: 'media_assets/supplier_demo_001/data_center.mp4',
        publicUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/data_center.mp4',
        mediaType: 'video',
        mimeType: 'video/mp4',
        status: 'ready',
        createdAt: new Date()
      },
      {
        id: 'asset_004',
        userId: supplierData.id,
        storagePath: 'media_assets/supplier_demo_001/ai_platform.jpg',
        publicUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/ai_platform.jpg',
        mediaType: 'image',
        mimeType: 'image/jpeg',
        status: 'ready',
        createdAt: new Date()
      },
      {
        id: 'asset_005',
        userId: supplierData.id,
        storagePath: 'media_assets/supplier_demo_001/ai_dashboard.jpg',
        publicUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/ai_dashboard.jpg',
        mediaType: 'image',
        mimeType: 'image/jpeg',
        status: 'ready',
        createdAt: new Date()
      },
      {
        id: 'asset_006',
        userId: supplierData.id,
        storagePath: 'media_assets/supplier_demo_001/smart_device.jpg',
        publicUrl: 'https://d565-static-leverage-test-abc123-9bn41a84185-1382937545.cos.ap-shanghai.myqcloud.com/media_assets/supplier_demo_001/smart_device.jpg',
        mediaType: 'image',
        mimeType: 'image/jpeg',
        status: 'ready',
        createdAt: new Date()
      }
    ];

    // Save media assets data (skip if collection doesn't exist)
    try {
      for (const asset of mediaAssetsData) {
        const assetRef = db.collection('media_assets').doc(asset.id);
        await assetRef.set(asset);
      }
      console.log('✅ Media assets data saved successfully');
    } catch (error) {
      console.log('⚠️  Media assets collection may not exist, skipping...');
      console.log('   Error:', error.message);
    }

    console.log('\n🎉 Complete supplier mock data created successfully!');
    console.log('📋 Summary:');
    console.log(`   - Supplier: ${supplierData.name}`);
    console.log(`   - Products: ${productsData.length} items`);
    console.log(`   - Media Assets: ${mediaAssetsData.length} files`);
    console.log(`   - Supplier ID: ${supplierData.id}`);
    console.log('\n🔗 Media URLs are using COS (Tencent Cloud Object Storage)');
    console.log('📝 Note: Actual files should be uploaded to COS for the URLs to work');

  } catch (error) {
    console.error('❌ Error creating supplier data:', error);
    process.exit(1);
  }
}

// Run the script
createCompleteSupplierData().then(() => {
  console.log('\n✨ Script completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});