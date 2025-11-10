#!/usr/bin/env node

/**
 * 数据库迁移和修复脚本
 * 自动修复数据库对齐问题，补充缺失数据
 */

const cloudbase = require('@cloudbase/node-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Firebase备份文件路径
const FIREBASE_BACKUP_PATH = path.join(__dirname, '..', 'firebase-backup.json');

// 数据库结构和样例数据
const databaseSchema = {
  users: {
    fields: [
      { field: 'uid', type: 'string', required: true },
      { field: 'name', type: 'string', required: true },
      { field: 'email', type: 'string', required: true },
      { field: 'role', type: 'string', required: true },
      { field: 'avatar', type: 'string', required: false },
      { field: 'rating', type: 'number', required: true },
      { field: 'status', type: 'string', required: true },
      { field: 'aiAssistantEnabled', type: 'boolean', required: false },
      { field: 'alwaysAvailable', type: 'boolean', required: false },
      { field: 'createdAt', type: 'timestamp', required: true },
      { field: 'bio', type: 'string', required: false },
      { field: 'skills', type: 'array', required: false }
    ],
    sampleData: [
      {
        uid: 'admin1',
        name: '李明',
        email: 'admin@leverage.com',
        avatar: 'https://example.com/avatar1.jpg',
        role: 'admin',
        rating: 5.0,
        status: 'active',
        aiAssistantEnabled: true,
        alwaysAvailable: true,
        createdAt: new Date(),
        bio: '系统管理员',
        skills: ['管理', '协调']
      },
      {
        uid: 'creator1',
        name: '张三',
        email: 'creator1@leverage.com',
        role: 'creator',
        rating: 4.8,
        status: 'active',
        aiAssistantEnabled: true,
        alwaysAvailable: false,
        createdAt: new Date(),
        bio: '专业3D设计师',
        skills: ['3D建模', '渲染']
      }
    ]
  },

  demands: {
    fields: [
      { field: 'id', type: 'string', required: true },
      { field: 'type', type: 'string', required: true },
      { field: 'title', type: 'string', required: true },
      { field: 'description', type: 'string', required: true },
      { field: 'budget', type: 'number', required: true },
      { field: 'category', type: 'string', required: true },
      { field: 'status', type: 'string', required: true },
      { field: 'requesterId', type: 'string', required: true },
      { field: 'requesterName', type: 'string', required: true },
      { field: 'createdAt', type: 'timestamp', required: true }
    ],
    sampleData: [
      {
        id: 'demand1',
        type: 'public',
        title: '生日礼物创意设计',
        description: '需要为30岁男性生日设计一份特别的礼物',
        budget: 800,
        category: '创意设计',
        status: '开放中',
        requesterId: 'user1',
        requesterName: '小明',
        createdAt: new Date()
      },
      {
        id: 'demand2',
        type: 'private',
        title: '公司Logo设计',
        description: '科技公司新Logo设计',
        budget: 2000,
        category: '品牌设计',
        status: '进行中',
        requesterId: 'supplier1',
        requesterName: '王五',
        createdAt: new Date()
      }
    ]
  },

  products: {
    fields: [
      { field: 'id', type: 'string', required: true },
      { field: 'name', type: 'string', required: true },
      { field: 'description', type: 'string', required: true },
      { field: 'price', type: 'number', required: true },
      { field: 'category', type: 'string', required: true },
      { field: 'purchaseUrl', type: 'string', required: true },
      { field: 'imageUrl', type: 'string', required: true },
      { field: 'createdAt', type: 'timestamp', required: true }
    ],
    sampleData: [
      {
        id: 'product1',
        name: '高端商务椅3D模型',
        description: 'Ergonomic office chair with lumbar support',
        price: 2999,
        category: '家具',
        purchaseUrl: 'https://example.com/product1',
        imageUrl: 'https://example.com/product1.jpg',
        createdAt: new Date()
      }
    ]
  },

  suppliers: {
    fields: [
      { field: 'id', type: 'string', required: true },
      { field: 'name', type: 'string', required: true },
      { field: 'region', type: 'string', required: true },
      { field: 'email', type: 'string', required: true },
      { field: 'creditCode', type: 'string', required: true },
      { field: 'establishedDate', type: 'timestamp', required: true }
    ],
    sampleData: [
      {
        id: 'supplier1',
        name: '创意科技设计有限公司',
        region: '北京',
        email: 'contact@creativetech.com',
        creditCode: '91110000123456789X',
        establishedDate: new Date('2020-01-01')
      }
    ]
  },

  prompts: {
    fields: [
      { field: 'id', type: 'string', required: true },
      { field: 'name', type: 'string', required: true },
      { field: 'content', type: 'string', required: true },
      { field: 'scope', type: 'string', required: true },
      { field: 'status', type: 'string', required: true },
      { field: 'ownerId', type: 'string', required: true },
      { field: 'modelId', type: 'string', required: true }
    ],
    sampleData: [
      {
        id: 'default-recommend',
        name: '默认推荐提示',
        content: '基于用户描述和预算推荐产品',
        scope: '推荐',
        status: '生效中',
        ownerId: 'admin1',
        modelId: 'openai-gpt4'
      }
    ]
  }
};

// 检查并修复集合
async function checkAndFixCollections(db) {
  console.log('🔧 开始检查和修复集合...\n');

  const existingCollections = ['users', 'products', 'demands', 'suppliers', 'prompts'];
  let fixesApplied = 0;

  for (const collectionName of existingCollections) {
    console.log(`📋 检查集合: ${collectionName}`);
    const collection = db.collection(collectionName);
    let recordCount = 0;

    try {
      const countResult = await collection.count();
      recordCount = countResult.total || 0;
    } catch (error) {
      const msg = (error && error.message) ? error.message : String(error);
      const notExist = msg.includes('ResourceNotFound') || msg.includes('not exist');
      if (notExist) {
        // 集合不存在时尝试创建集合
        try {
          if (typeof db.createCollection === 'function') {
            await db.createCollection(collectionName);
            console.log(`  🆕 已创建集合: ${collectionName}`);
          } else {
            // 兼容：通过首次插入触发集合创建
            console.log(`  ℹ️ SDK不支持直接创建集合，将通过写入触发创建: ${collectionName}`);
          }
        } catch (createErr) {
          console.log(`  ❌ 创建集合失败: ${createErr.message}`);
        }
      } else {
        console.log(`  ❌ 检查集合 ${collectionName} 失败: ${msg}`);
        continue;
      }
    }

    // 如果为空或刚创建，写入样例数据
    if (recordCount === 0) {
      console.log(`  ⚠️  ${collectionName} 为空，开始添加样例数据...`);
      const schema = databaseSchema[collectionName];
      if (schema && schema.sampleData) {
        let added = 0;
        for (const sampleDoc of schema.sampleData) {
          try {
            await collection.add(sampleDoc);
            added++;
          } catch (error) {
            console.log(`    ❌ 添加数据失败: ${error.message}`);
          }
        }
        if (added > 0) {
          console.log(`    ✅ 成功添加 ${added} 条样例数据`);
          fixesApplied++;
        }
      }
    } else {
      console.log(`  ✅ ${collectionName} 已有 ${recordCount} 条数据，跳过`);
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ 集合修复完成，共应用 ${fixesApplied} 个修复`);
  return fixesApplied;
}

// 验证数据完整性
async function validateDataIntegrity(db) {
  console.log('🔍 验证数据完整性...\n');

  const issues = [];
  const existingCollections = ['users', 'products', 'demands', 'suppliers', 'prompts'];

  for (const collectionName of existingCollections) {
    try {
      const collection = db.collection(collectionName);
      const docs = await collection.limit(5).get();

      if (docs.data && docs.data.length > 0) {
        const schema = databaseSchema[collectionName];
        if (schema && schema.fields) {
          const sample = docs.data[0];
          const actualFields = Object.keys(sample);

          // 检查必需字段
          const requiredFields = schema.fields.filter(f => f.required).map(f => f.field);
          const missingFields = requiredFields.filter(field => !actualFields.includes(field));

          if (missingFields.length > 0) {
            issues.push({
              collection: collectionName,
              type: 'MISSING_FIELDS',
              details: `缺少必需字段: ${missingFields.join(', ')}`
            });
          }

          // 检查字段类型（基础检查）
          for (const fieldDef of schema.fields) {
            if (actualFields.includes(fieldDef.field)) {
              const actualValue = sample[fieldDef.field];
              const expectedType = fieldDef.type;

              if (actualValue !== null && actualValue !== undefined) {
                let typeMatch = false;

                switch (expectedType) {
                  case 'string':
                    typeMatch = typeof actualValue === 'string';
                    break;
                  case 'number':
                    typeMatch = typeof actualValue === 'number';
                    break;
                  case 'boolean':
                    typeMatch = typeof actualValue === 'boolean';
                    break;
                  case 'array':
                    typeMatch = Array.isArray(actualValue);
                    break;
                  case 'timestamp':
                    typeMatch = actualValue instanceof Date || typeof actualValue === 'string';
                    break;
                }

                if (!typeMatch) {
                  issues.push({
                    collection: collectionName,
                    type: 'TYPE_MISMATCH',
                    details: `字段 ${fieldDef.field} 类型不匹配，期望 ${expectedType}，实际 ${typeof actualValue}`
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      issues.push({
        collection: collectionName,
        type: 'ACCESS_ERROR',
        details: `访问集合失败: ${error.message}`
      });
    }
  }

  if (issues.length > 0) {
    console.log('⚠️  发现数据完整性问题:');
    issues.forEach(issue => {
      console.log(`  ${issue.collection}: ${issue.details}`);
    });
  } else {
    console.log('✅ 数据完整性验证通过');
  }

  return issues;
}

// 主迁移函数
async function runMigration() {
  try {
    console.log('🚀 开始数据库迁移和修复...\n');

    // 初始化TCB
    const app = cloudbase.init({
      env: process.env.TCB_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV,
      secretId: process.env.TCB_SECRET_ID || process.env.TENCENTCLOUD_SECRET_ID,
      secretKey: process.env.TCB_SECRET_KEY || process.env.TENCENTCLOUD_SECRET_KEY,
      region: process.env.TENCENTCLOUD_REGION || 'ap-shanghai'
    });

    const db = app.database();
    console.log('✅ TCB数据库连接成功\n');

    // 步骤1: 检查并修复集合
    const fixesApplied = await checkAndFixCollections(db);

    // 步骤2: 验证数据完整性
    const integrityIssues = await validateDataIntegrity(db);

    // 步骤3: 最终验证
    console.log('\n📊 迁移结果:');
    console.log('='.repeat(60));

    if (fixesApplied > 0) {
      console.log(`✅ 应用了 ${fixesApplied} 个修复`);
    }

    if (integrityIssues.length > 0) {
      console.log(`⚠️  发现 ${integrityIssues.length} 个数据完整性问题`);
      console.log('\n💡 建议手动检查和修复数据类型问题');
    } else {
      console.log('✅ 数据完整性验证通过');
    }

    // 检查关键集合
    const criticalCollections = ['users', 'demands'];
    let criticalOk = true;

    console.log('\n🎯 关键集合状态:');
    for (const coll of criticalCollections) {
      try {
        const collection = db.collection(coll);
        const count = await collection.count();
        const status = count.total > 0 ? '✅' : '❌';
        console.log(`  ${status} ${coll}: ${count.total} 条数据`);
        if (count.total === 0) criticalOk = false;
      } catch (error) {
        console.log(`  ❌ ${coll}: 访问失败`);
        criticalOk = false;
      }
    }

    console.log('\n' + '='.repeat(60));

    if (criticalOk && integrityIssues.length === 0) {
      console.log('🎉 数据库迁移完成！所有关键集合都有数据，数据完整性良好。');
      console.log('✅ 可以进行下一步：API测试。');
    } else {
      console.log('⚠️  迁移完成，但仍存在问题。');
      if (!criticalOk) {
        console.log('🚨 关键集合 (users/demands) 仍有问题，影响AI flows测试！');
      }
      console.log('\n💡 建议:');
      console.log('  1. 检查TCB控制台 > 数据库 > 刷新集合');
      console.log('  2. 如有Firebase备份，运行数据导入');
      console.log('  3. 重新运行: node scripts/db-check.js');
    }

    console.log('\n✅ 数据库迁移流程完成');

    return {
      fixesApplied,
      integrityIssues,
      criticalOk
    };

  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  }
}

// 运行迁移
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, databaseSchema };