const fs = require('fs');
const path = require('path');

// 读取当前的JSON数组文件
function convertToJsonLines() {
    const inputPath = path.join(__dirname, 'data', 'llm_connections.json');
    const outputPath = path.join(__dirname, 'data', 'llm_connections.jsonl');

    try {
        // 读取JSON数组文件
        const jsonArrayData = fs.readFileSync(inputPath, 'utf8');
        const connections = JSON.parse(jsonArrayData);

        // 转换为JSON Lines格式
        const jsonLines = connections.map(conn => JSON.stringify(conn)).join('\n');

        // 保存为.jsonl文件
        fs.writeFileSync(outputPath, jsonLines, 'utf8');

        console.log(`✅ 已转换 ${connections.length} 个连接为JSON Lines格式`);
        console.log(`📁 文件保存到: ${outputPath}`);

        // 同时复制到剪贴板
        console.log('\n📋 JSON Lines数据已准备好，可直接复制到TCB控制台导入');
        console.log('=' .repeat(50));
        console.log(jsonLines);

        return connections.length;
    } catch (error) {
        console.error('❌ 转换失败:', error.message);
        return 0;
    }
}

// 执行转换
const count = convertToJsonLines();
if (count > 0) {
    console.log(`\n🎯 导入TCB时请选择格式: JSON Lines (.jsonl)`);
    console.log(`📊 记录数量: ${count}`);
}