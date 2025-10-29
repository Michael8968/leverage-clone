const fs = require('fs');
const path = require('path');

// 读取JSON Lines文件并转换为CSV格式
function convertToCsv() {
    const inputPath = path.join(__dirname, 'data', 'llm_connections.jsonl');
    const outputPath = path.join(__dirname, 'data', 'llm_connections.csv');

    try {
        // 读取JSON Lines文件
        const jsonLinesData = fs.readFileSync(inputPath, 'utf8');
        const lines = jsonLinesData.trim().split('\n');

        // 解析第一行获取字段名
        const firstRecord = JSON.parse(lines[0]);
        const headers = Object.keys(firstRecord);

        // 生成CSV头部
        let csvContent = headers.join(',') + '\n';

        // 处理每一行数据
        for (const line of lines) {
            if (line.trim()) {
                const record = JSON.parse(line);
                const values = headers.map(header => {
                    const value = record[header];
                    // 如果值包含逗号、引号或换行符，需要用引号包围并转义
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return '"' + value.replace(/"/g, '""') + '"';
                    }
                    return value;
                });
                csvContent += values.join(',') + '\n';
            }
        }

        // 保存为CSV文件
        fs.writeFileSync(outputPath, csvContent, 'utf8');

        console.log(`✅ 已转换 ${lines.length} 个连接为CSV格式`);
        console.log(`📁 文件保存到: ${outputPath}`);

        // 显示CSV内容预览
        console.log('\n📋 CSV内容预览:');
        console.log('=' .repeat(50));
        const previewLines = csvContent.split('\n').slice(0, 5);
        console.log(previewLines.join('\n'));

        return lines.length;
    } catch (error) {
        console.error('❌ 转换失败:', error.message);
        return 0;
    }
}

// 执行转换
const count = convertToCsv();
if (count > 0) {
    console.log(`\n🎯 导入TCB时请选择格式: CSV`);
    console.log(`📊 记录数量: ${count}`);
}