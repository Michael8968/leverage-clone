const fs = require('fs');
const path = require('path');

// 验证本地数据文件完整性
async function validateLocalDataIntegrity() {
    console.log('🔍 开始验证本地数据文件完整性...\n');

    const dataDir = path.join(__dirname, '../data');
    const results = {
        suppliers: { status: 'pending', count: 0, errors: [] },
        products: { status: 'pending', count: 0, errors: [] },
        ai_scenarios: { status: 'pending', count: 0, errors: [] },
        demands: { status: 'pending', count: 0, errors: [] },
        users: { status: 'pending', count: 0, errors: [] },
        llm_connections: { status: 'pending', count: 0, errors: [] }
    };

    // 验证供应商数据
    try {
        console.log('📦 检查供应商数据...');
        const suppliersPath = path.join(dataDir, 'suppliers.json');
        if (!fs.existsSync(suppliersPath)) {
            results.suppliers.status = 'error';
            results.suppliers.errors.push('供应商数据文件不存在');
            console.log('❌ 供应商数据文件不存在');
        } else {
            const suppliers = JSON.parse(fs.readFileSync(suppliersPath, 'utf-8'));
            results.suppliers.count = suppliers.length;
            results.suppliers.status = 'success';

            // 检查数据完整性
            suppliers.forEach((supplier, index) => {
                const errors = [];
                if (!supplier.name) errors.push('缺少供应商名称');
                if (!supplier.id) errors.push('缺少供应商ID');
                if (errors.length > 0) {
                    results.suppliers.errors.push(`供应商 ${index + 1}: ${errors.join(', ')}`);
                }
            });

            console.log(`✅ 供应商数据: ${suppliers.length} 条记录`);
        }
    } catch (error) {
        results.suppliers.status = 'error';
        results.suppliers.errors.push(`文件读取失败: ${error.message}`);
        console.log(`❌ 供应商数据检查失败: ${error.message}`);
    }

    // 验证商品/服务数据
    try {
        console.log('🛍️ 检查商品/服务数据...');
        const productsPath = path.join(dataDir, 'products.json');
        if (!fs.existsSync(productsPath)) {
            results.products.status = 'error';
            results.products.errors.push('商品数据文件不存在');
            console.log('❌ 商品数据文件不存在');
        } else {
            const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
            results.products.count = products.length;
            results.products.status = 'success';

            // 检查数据完整性
            products.forEach((product, index) => {
                const errors = [];
                if (!product.name) errors.push('缺少商品名称');
                if (!product.supplierId && !product.creatorId) errors.push('缺少供应商或创作者ID');
                if (typeof product.price !== 'number') errors.push('价格格式不正确');
                if (errors.length > 0) {
                    results.products.errors.push(`商品 ${index + 1}: ${errors.join(', ')}`);
                }
            });

            console.log(`✅ 商品/服务数据: ${products.length} 条记录`);
        }
    } catch (error) {
        results.products.status = 'error';
        results.products.errors.push(`文件读取失败: ${error.message}`);
        console.log(`❌ 商品/服务数据检查失败: ${error.message}`);
    }

    // 验证需求数据
    try {
        console.log('📋 检查需求数据...');
        const demandsPath = path.join(dataDir, 'demands.json');
        if (!fs.existsSync(demandsPath)) {
            results.demands.status = 'error';
            results.demands.errors.push('需求数据文件不存在');
            console.log('❌ 需求数据文件不存在');
        } else {
            const demands = JSON.parse(fs.readFileSync(demandsPath, 'utf-8'));
            results.demands.count = demands.length;
            results.demands.status = 'success';

            console.log(`✅ 需求数据: ${demands.length} 条记录`);
        }
    } catch (error) {
        results.demands.status = 'error';
        results.demands.errors.push(`文件读取失败: ${error.message}`);
        console.log(`❌ 需求数据检查失败: ${error.message}`);
    }

    // 验证用户数据
    try {
        console.log('👥 检查用户数据...');
        const usersPath = path.join(dataDir, 'users.json');
        if (!fs.existsSync(usersPath)) {
            results.users.status = 'error';
            results.users.errors.push('用户数据文件不存在');
            console.log('❌ 用户数据文件不存在');
        } else {
            const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
            results.users.count = users.length;
            results.users.status = 'success';

            console.log(`✅ 用户数据: ${users.length} 条记录`);
        }
    } catch (error) {
        results.users.status = 'error';
        results.users.errors.push(`文件读取失败: ${error.message}`);
        console.log(`❌ 用户数据检查失败: ${error.message}`);
    }

    // 验证AI场景数据 (如果存在)
    try {
        console.log('🎭 检查AI场景数据...');
        const scenariosPath = path.join(dataDir, 'ai_scenarios.json');
        if (!fs.existsSync(scenariosPath)) {
            results.ai_scenarios.status = 'warning';
            results.ai_scenarios.errors.push('AI场景数据文件不存在，使用默认配置');
            console.log('⚠️ AI场景数据文件不存在，使用默认配置');
        } else {
            const scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));
            results.ai_scenarios.count = scenarios.length;
            results.ai_scenarios.status = 'success';

            // 检查数据完整性
            scenarios.forEach((scenario, index) => {
                const errors = [];
                if (!scenario.name) errors.push('缺少场景名称');
                if (!scenario.promptKey) errors.push('缺少提示词键');
                if (!scenario.tags || !Array.isArray(scenario.tags)) errors.push('标签格式不正确');
                if (errors.length > 0) {
                    results.ai_scenarios.errors.push(`场景 ${index + 1}: ${errors.join(', ')}`);
                }
            });

            console.log(`✅ AI场景数据: ${scenarios.length} 条记录`);
        }
    } catch (error) {
        results.ai_scenarios.status = 'error';
        results.ai_scenarios.errors.push(`文件读取失败: ${error.message}`);
        console.log(`❌ AI场景数据检查失败: ${error.message}`);
    }

    // 验证LLM连接数据 (如果存在)
    try {
        console.log('🤖 检查LLM连接数据...');
        const llmPath = path.join(dataDir, 'llm_connections.json');
        if (!fs.existsSync(llmPath)) {
            results.llm_connections.status = 'warning';
            results.llm_connections.errors.push('LLM连接数据文件不存在，使用默认配置');
            console.log('⚠️ LLM连接数据文件不存在，使用默认配置');
        } else {
            const llmConnections = JSON.parse(fs.readFileSync(llmPath, 'utf-8'));
            results.llm_connections.count = llmConnections.length;
            results.llm_connections.status = 'success';

            // 检查数据完整性
            llmConnections.forEach((connection, index) => {
                const errors = [];
                if (!connection.provider) errors.push('缺少提供商');
                if (!connection.modelName) errors.push('缺少模型名称');
                if (!connection.apiKey) errors.push('缺少API密钥');
                if (errors.length > 0) {
                    results.llm_connections.errors.push(`连接 ${index + 1}: ${errors.join(', ')}`);
                }
            });

            console.log(`✅ LLM连接数据: ${llmConnections.length} 条记录`);
        }
    } catch (error) {
        results.llm_connections.status = 'error';
        results.llm_connections.errors.push(`文件读取失败: ${error.message}`);
        console.log(`❌ LLM连接数据检查失败: ${error.message}`);
    }

    // 输出验证报告
    console.log('\n📊 本地数据完整性验证报告:');
    console.log('='.repeat(50));

    Object.entries(results).forEach(([collection, result]) => {
        const statusIcon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : result.status === 'warning' ? '⚠️' : '⏳';
        console.log(`${statusIcon} ${collection}: ${result.count} 条记录`);

        if (result.errors.length > 0) {
            result.errors.forEach(error => {
                console.log(`   ⚠️ ${error}`);
            });
        }
    });

    // 总结
    const totalErrors = Object.values(results).reduce((sum, result) => sum + result.errors.length, 0);
    const failedCollections = Object.values(results).filter(result => result.status === 'error').length;
    const warningCollections = Object.values(results).filter(result => result.status === 'warning').length;

    console.log('\n🎯 验证总结:');
    if (failedCollections === 0 && totalErrors === 0) {
        console.log('✅ 所有本地数据文件完整，数据结构正确！');
    } else if (failedCollections === 0) {
        console.log(`⚠️ 数据文件存在但有 ${totalErrors} 个数据完整性问题，${warningCollections} 个集合使用默认配置`);
        console.log('\n💡 建议修复措施:');
        console.log('1. 检查缺失的必填字段数据');
        console.log('2. 验证数据格式是否正确');
        console.log('3. 运行数据迁移脚本修复数据结构');
    } else {
        console.log(`❌ 发现 ${failedCollections} 个数据文件缺失或损坏，${totalErrors} 个数据完整性问题`);
        console.log('\n💡 建议修复措施:');
        console.log('1. 检查 data/ 目录是否存在');
        console.log('2. 重新生成缺失的数据文件');
        console.log('3. 检查文件权限设置');
        console.log('4. 验证 JSON 格式是否正确');
    }

    return results;
}

// 执行验证
validateLocalDataIntegrity().catch(console.error);