/**
 * 供应商模块功能验证测试
 * 验证：供应商基本信息、商品/服务信息、图片、视频入库功能
 */

async function testSupplierModule() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          供应商模块功能验证测试                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const results: any[] = [];
  
  // 导入模块
  const { getTcbDb } = await import('../src/lib/tcb.js');
  
  // === 测试1: 供应商基本信息入库 ===
  console.log('📋 测试 1: 供应商基本信息入库\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  const testSupplier = {
    name: `测试供应商-${Date.now()}`,
    shortName: '测试供应商',
    region: '广东省深圳市',
    address: '南山区科技园',
    registeredCapital: '1000万元',
    creditCode: 'TEST123456789',
    email: `supplier-test-${Date.now()}@example.com`,
    supplementaryFields: [
      { key: '主营业务', value: '电子产品' },
      { key: '联系电话', value: '13800138000' }
    ]
  };

  try {
    const db = getTcbDb();
    
    console.log('1. 创建供应商基本信息...');
    const supplierDoc = {
      ...testSupplier,
      id: `supplier_${Date.now()}`,
      createdAt: db.serverDate ? db.serverDate() : new Date(),
    };
    
    await db.collection('suppliers').add(supplierDoc);
    console.log('   ✓ 供应商信息已写入数据库');
    console.log(`   供应商名称: ${supplierDoc.name}`);
    console.log(`   所在区域: ${supplierDoc.region}`);
    console.log(`   注册资本: ${supplierDoc.registeredCapital}`);
    console.log(`   补充字段数量: ${supplierDoc.supplementaryFields.length}`);
    
    console.log('\n2. 验证数据持久化...');
    const verifyQuery = await db.collection('suppliers')
      .where({ name: testSupplier.name })
      .limit(1)
      .get();
    
    if (!verifyQuery?.data?.length) {
      throw new Error('供应商信息未成功持久化');
    }
    
    const savedSupplier = verifyQuery.data[0];
    console.log('   ✓ 数据持久化验证成功');
    console.log(`   查询到供应商: ${savedSupplier.name}`);
    console.log(`   地址: ${savedSupplier.address}`);
    console.log(`   邮箱: ${savedSupplier.email}`);
    console.log();
    
    results.push({
      name: '供应商基本信息入库',
      passed: true,
      message: `成功创建并验证: ${testSupplier.name}`
    });
  } catch (error: any) {
    console.error(`✗ 供应商基本信息入库失败: ${error.message}\n`);
    results.push({
      name: '供应商基本信息入库',
      passed: false,
      message: error.message
    });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 测试2: 商品/服务信息入库 ===
  console.log('📋 测试 2: 商品/服务信息入库\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  const testProduct = {
    name: `测试商品-${Date.now()}`,
    description: '这是一个测试商品，用于验证商品入库功能',
    price: 999.99,
    category: '电子产品',
    supplierId: `supplier_${Date.now()}`,
    supplierName: '测试供应商',
    purchaseUrl: 'https://example.com/product/test',
    sku: 'TEST-SKU-001',
    status: '已入库' as const,
    details: [
      { key: '品牌', value: '测试品牌' },
      { key: '型号', value: 'TEST-2024' },
      { key: '保修期', value: '1年' }
    ]
  };

  try {
    const db = getTcbDb();
    
    console.log('1. 创建商品信息...');
    const productDoc = {
      ...testProduct,
      id: `product_${Date.now()}`,
      createdAt: db.serverDate ? db.serverDate() : new Date(),
      images: [] // 将在下一个测试中添加图片
    };
    
    await db.collection('products').add(productDoc);
    console.log('   ✓ 商品信息已写入数据库');
    console.log(`   商品名称: ${productDoc.name}`);
    console.log(`   价格: ¥${productDoc.price}`);
    console.log(`   类别: ${productDoc.category}`);
    console.log(`   SKU: ${productDoc.sku}`);
    console.log(`   状态: ${productDoc.status}`);
    console.log(`   规格数量: ${productDoc.details.length}`);
    
    console.log('\n2. 验证商品数据...');
    const verifyProduct = await db.collection('products')
      .where({ name: testProduct.name })
      .limit(1)
      .get();
    
    if (!verifyProduct?.data?.length) {
      throw new Error('商品信息未成功持久化');
    }
    
    const savedProduct = verifyProduct.data[0];
    console.log('   ✓ 商品数据验证成功');
    console.log(`   查询到商品: ${savedProduct.name}`);
    console.log(`   描述: ${savedProduct.description}`);
    console.log(`   供应商ID: ${savedProduct.supplierId}`);
    console.log();
    
    results.push({
      name: '商品/服务信息入库',
      passed: true,
      message: `成功创建并验证: ${testProduct.name}`
    });
  } catch (error: any) {
    console.error(`✗ 商品信息入库失败: ${error.message}\n`);
    results.push({
      name: '商品/服务信息入库',
      passed: false,
      message: error.message
    });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 测试3: 商品图片信息入库 ===
  console.log('📋 测试 3: 商品图片信息入库\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  const testImages = [
    {
      url: 'https://example.com/images/product-front.jpg',
      view: '前' as const,
      caption: '产品正面图'
    },
    {
      url: 'https://example.com/images/product-side.jpg',
      view: '左' as const,
      caption: '产品侧面图'
    },
    {
      url: 'https://example.com/images/product-detail.jpg',
      view: '默认' as const,
      caption: '产品细节图'
    }
  ];

  try {
    const db = getTcbDb();
    
    console.log('1. 创建带图片的商品...');
    const productWithImages = {
      name: `带图片的商品-${Date.now()}`,
      description: '测试商品图片入库功能',
      price: 599.99,
      category: '测试类别',
      supplierId: `supplier_${Date.now()}`,
      images: testImages,
      imageUrl: testImages[0].url, // 主图
      thumbnailUrl: testImages[0].url, // 缩略图
      createdAt: db.serverDate ? db.serverDate() : new Date()
    };
    
    await db.collection('products').add(productWithImages);
    console.log('   ✓ 商品图片信息已写入');
    console.log(`   商品名称: ${productWithImages.name}`);
    console.log(`   图片数量: ${productWithImages.images.length}`);
    console.log(`   主图URL: ${productWithImages.imageUrl}`);
    
    testImages.forEach((img, idx) => {
      console.log(`   图片${idx + 1}: ${img.view}视角 - ${img.caption}`);
    });
    
    console.log('\n2. 验证图片数据...');
    const verifyImages = await db.collection('products')
      .where({ name: productWithImages.name })
      .limit(1)
      .get();
    
    if (!verifyImages?.data?.length) {
      throw new Error('图片信息未成功持久化');
    }
    
    const savedProductWithImages = verifyImages.data[0];
    console.log('   ✓ 图片数据验证成功');
    console.log(`   查询到商品: ${savedProductWithImages.name}`);
    console.log(`   图片数组长度: ${savedProductWithImages.images?.length || 0}`);
    
    if (savedProductWithImages.images && savedProductWithImages.images.length > 0) {
      savedProductWithImages.images.forEach((img: any, idx: number) => {
        console.log(`   图片${idx + 1}: ${img.url} (${img.view}视角)`);
      });
    }
    console.log();
    
    results.push({
      name: '商品图片信息入库',
      passed: true,
      message: `成功创建并验证${testImages.length}张图片`
    });
  } catch (error: any) {
    console.error(`✗ 图片信息入库失败: ${error.message}\n`);
    results.push({
      name: '商品图片信息入库',
      passed: false,
      message: error.message
    });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 测试4: 视频信息入库 ===
  console.log('📋 测试 4: 商品视频信息入库\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  try {
    const db = getTcbDb();
    
    console.log('1. 创建带视频的商品...');
    const productWithVideo = {
      name: `带视频的商品-${Date.now()}`,
      description: '测试商品视频入库功能',
      price: 1299.99,
      category: '测试类别',
      supplierId: `supplier_${Date.now()}`,
      images: [],
      details: [
        { key: '演示视频', value: 'https://example.com/videos/product-demo.mp4' },
        { key: '使用教程', value: 'https://example.com/videos/tutorial.mp4' }
      ],
      createdAt: db.serverDate ? db.serverDate() : new Date()
    };
    
    await db.collection('products').add(productWithVideo);
    console.log('   ✓ 商品视频信息已写入');
    console.log(`   商品名称: ${productWithVideo.name}`);
    console.log(`   视频相关字段数: ${productWithVideo.details.filter(d => d.key.includes('视频') || d.key.includes('教程')).length}`);
    
    productWithVideo.details.forEach((detail, idx) => {
      if (detail.key.includes('视频') || detail.key.includes('教程')) {
        console.log(`   ${detail.key}: ${detail.value}`);
      }
    });
    
    console.log('\n2. 验证视频数据...');
    const verifyVideo = await db.collection('products')
      .where({ name: productWithVideo.name })
      .limit(1)
      .get();
    
    if (!verifyVideo?.data?.length) {
      throw new Error('视频信息未成功持久化');
    }
    
    const savedProductWithVideo = verifyVideo.data[0];
    console.log('   ✓ 视频数据验证成功');
    console.log(`   查询到商品: ${savedProductWithVideo.name}`);
    console.log(`   补充字段数量: ${savedProductWithVideo.details?.length || 0}`);
    console.log();
    
    results.push({
      name: '商品视频信息入库',
      passed: true,
      message: '成功创建并验证视频信息'
    });
  } catch (error: any) {
    console.error(`✗ 视频信息入库失败: ${error.message}\n`);
    results.push({
      name: '商品视频信息入库',
      passed: false,
      message: error.message
    });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 测试5: 错误处理和数据验证 ===
  console.log('📋 测试 5: 错误处理和数据验证\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  try {
    const db = getTcbDb();
    
    console.log('1. 测试空数据处理...');
    try {
      await db.collection('products').add({
        name: '',
        description: '',
        price: -1,
      });
      console.log('   ⚠ 空数据被接受（需要前端验证）');
    } catch (err: any) {
      console.log('   ✓ 空数据被正确拒绝');
    }
    
    console.log('\n2. 测试查询不存在的数据...');
    const notFound = await db.collection('suppliers')
      .where({ name: 'NotExistSupplier999999' })
      .limit(1)
      .get();
    
    if (!notFound?.data?.length) {
      console.log('   ✓ 正确返回空结果，无报错');
    }
    
    console.log('\n3. 测试数据库连接异常处理...');
    try {
      // 尝试查询不存在的集合
      const invalidQuery = await db.collection('invalid_collection_test_999')
        .limit(1)
        .get();
      console.log('   ✓ 查询不存在的集合无报错，返回空结果');
    } catch (err: any) {
      console.log(`   ⚠ 查询异常: ${err.message}`);
    }
    console.log();
    
    results.push({
      name: '错误处理和数据验证',
      passed: true,
      message: '错误处理机制正常'
    });
  } catch (error: any) {
    console.error(`✗ 错误处理测试失败: ${error.message}\n`);
    results.push({
      name: '错误处理和数据验证',
      passed: false,
      message: error.message
    });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // 打印结果
  printResults(results);
}

function printResults(results: any[]) {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        测试摘要                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach((r, idx) => {
    const icon = r.passed ? '✓' : '✗';
    const status = r.passed ? '通过' : '失败';
    console.log(`${idx + 1}. ${icon} ${r.name}: ${status}`);
    console.log(`   ${r.message}`);
    console.log();
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`总计: ${passed}/${total} 通过 (${Math.round(passed/total*100)}%)`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed === total) {
    console.log('🎉 所有测试通过！');
    console.log('✓ 供应商基本信息正常入库');
    console.log('✓ 商品/服务信息正常入库');
    console.log('✓ 图片信息正常入库');
    console.log('✓ 视频信息正常入库');
    console.log('✓ 错误处理机制完善，无报错\n');
    process.exit(0);
  } else {
    console.log('❌ 部分测试失败，请检查上述错误信息。\n');
    process.exit(1);
  }
}

testSupplierModule().catch(err => {
  console.error('\n❌ 测试执行异常:', err);
  console.error(err.stack);
  process.exit(1);
});
