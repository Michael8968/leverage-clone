#!/bin/bash

# TCB 生产环境部署脚本
# 版本: v2.6
# 日期: 2025-10-28

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 环境配置
TCB_ENV_ID="leverage-test-abc123-9bn41a84185"
DEPLOYMENT_VERSION="v2.6"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   TCB 生产环境部署脚本 - ${DEPLOYMENT_VERSION}                            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 步骤1: 检查前置条件
echo -e "${YELLOW}📋 步骤 1/7: 检查前置条件...${NC}"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 版本: $(node --version)${NC}"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm 版本: $(npm --version)${NC}"

# 检查TCB CLI（可选）
if command -v tcb &> /dev/null; then
    echo -e "${GREEN}✓ TCB CLI 版本: $(tcb --version)${NC}"
else
    echo -e "${YELLOW}⚠ TCB CLI 未安装（将使用手动部署方式）${NC}"
fi

echo ""

# 步骤2: 检查环境变量
echo -e "${YELLOW}📋 步骤 2/7: 检查环境变量...${NC}"

if [ ! -f ".env.production" ]; then
    echo -e "${RED}✗ .env.production 文件不存在${NC}"
    echo -e "${YELLOW}提示: 请从 .env.production.template 创建${NC}"
    exit 1
fi
echo -e "${GREEN}✓ .env.production 文件存在${NC}"

# 检查关键环境变量
if grep -q "your-production-jwt-secret-key-change-this" .env.production; then
    echo -e "${RED}✗ JWT_SECRET 使用默认值，请修改为强密钥${NC}"
    exit 1
fi
echo -e "${GREEN}✓ JWT_SECRET 已配置${NC}"

echo ""

# 步骤3: 清理旧构建
echo -e "${YELLOW}📋 步骤 3/7: 清理旧构建...${NC}"

if [ -d ".next" ]; then
    rm -rf .next
    echo -e "${GREEN}✓ 已清理 .next 目录${NC}"
fi

if [ -d "out" ]; then
    rm -rf out
    echo -e "${GREEN}✓ 已清理 out 目录${NC}"
fi

echo ""

# 步骤4: 安装依赖
echo -e "${YELLOW}📋 步骤 4/7: 安装依赖...${NC}"

npm ci --production=false
echo -e "${GREEN}✓ 依赖安装完成${NC}"

echo ""

# 步骤5: 运行检查
echo -e "${YELLOW}📋 步骤 5/7: 运行代码检查...${NC}"

# TypeScript检查
echo "运行 TypeScript 类型检查..."
npm run typecheck || {
    echo -e "${RED}✗ TypeScript 类型检查失败${NC}"
    exit 1
}
echo -e "${GREEN}✓ TypeScript 类型检查通过${NC}"

# ESLint检查
echo "运行 ESLint 检查..."
npm run lint || {
    echo -e "${YELLOW}⚠ ESLint 检查有警告（继续）${NC}"
}
echo -e "${GREEN}✓ ESLint 检查完成${NC}"

echo ""

# 步骤6: 构建生产版本
echo -e "${YELLOW}📋 步骤 6/7: 构建生产版本...${NC}"

# 使用生产环境变量构建
cp .env.production .env
npm run build || {
    echo -e "${RED}✗ 构建失败${NC}"
    exit 1
}
echo -e "${GREEN}✓ 构建完成${NC}"

echo ""

# 步骤7: 创建部署包
echo -e "${YELLOW}📋 步骤 7/7: 创建部署包...${NC}"

DEPLOY_DIR="leverage-deployment-${DEPLOYMENT_VERSION}"
DEPLOY_ZIP="${DEPLOY_DIR}.zip"

# 清理旧部署包
if [ -d "$DEPLOY_DIR" ]; then
    rm -rf "$DEPLOY_DIR"
fi

if [ -f "$DEPLOY_ZIP" ]; then
    rm -f "$DEPLOY_ZIP"
fi

# 创建部署目录
mkdir -p "$DEPLOY_DIR"

# 复制必要文件
echo "复制 standalone 输出..."
cp -r .next/standalone/* "$DEPLOY_DIR/"

echo "复制静态资源..."
mkdir -p "$DEPLOY_DIR/.next/static"
cp -r .next/static/* "$DEPLOY_DIR/.next/static/"

echo "复制公共资源..."
if [ -d "public" ]; then
    mkdir -p "$DEPLOY_DIR/public"
    cp -r public/* "$DEPLOY_DIR/public/"
fi

echo "复制环境变量..."
cp .env.production "$DEPLOY_DIR/.env"

echo "创建启动脚本..."
cat > "$DEPLOY_DIR/start.sh" << 'EOF'
#!/bin/bash
export NODE_ENV=production
export PORT=${PORT:-3000}
node server.js
EOF
chmod +x "$DEPLOY_DIR/start.sh"

echo "创建部署说明..."
cat > "$DEPLOY_DIR/DEPLOY_README.md" << EOF
# Leverage AI Platform - 部署包 ${DEPLOYMENT_VERSION}

## 部署信息
- 版本: ${DEPLOYMENT_VERSION}
- 构建时间: $(date +"%Y-%m-%d %H:%M:%S")
- 目标环境: TCB (${TCB_ENV_ID})

## 部署步骤

### 方法1: 使用TCB CLI
\`\`\`bash
tcb login
tcb hosting deploy . -e ${TCB_ENV_ID}
\`\`\`

### 方法2: 手动上传
1. 登录 TCB 控制台
2. 选择环境: ${TCB_ENV_ID}
3. 上传所有文件到根目录
4. 配置环境变量（从 .env 文件）
5. 重启应用

## 本地测试
\`\`\`bash
./start.sh
# 访问 http://localhost:3000
\`\`\`

## 验证清单
- [ ] 访问首页无报错
- [ ] 用户可注册和登录
- [ ] 供应商模块正常
- [ ] AI功能正常响应
- [ ] 数据库连接正常

## 回滚
如需回滚，使用上一个版本的部署包重新部署。
EOF

# 压缩部署包
echo "压缩部署包..."
zip -r "$DEPLOY_ZIP" "$DEPLOY_DIR" > /dev/null
echo -e "${GREEN}✓ 部署包创建完成: ${DEPLOY_ZIP}${NC}"

# 显示部署包信息
DEPLOY_SIZE=$(du -sh "$DEPLOY_ZIP" | cut -f1)
echo -e "${GREEN}✓ 部署包大小: ${DEPLOY_SIZE}${NC}"

echo ""

# 总结
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   部署准备完成                                                ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ 所有步骤完成！${NC}"
echo ""
echo -e "${YELLOW}📦 部署包信息:${NC}"
echo -e "  文件: ${DEPLOY_ZIP}"
echo -e "  大小: ${DEPLOY_SIZE}"
echo -e "  路径: $(pwd)/${DEPLOY_ZIP}"
echo ""
echo -e "${YELLOW}📋 下一步操作:${NC}"
echo -e "  1. 解压部署包: unzip ${DEPLOY_ZIP}"
echo -e "  2. 本地测试: cd ${DEPLOY_DIR} && ./start.sh"
echo -e "  3. 上传到TCB: tcb hosting deploy ${DEPLOY_DIR} -e ${TCB_ENV_ID}"
echo ""
echo -e "${YELLOW}📖 详细说明请查看:${NC}"
echo -e "  - ${DEPLOY_DIR}/DEPLOY_README.md"
echo -e "  - PRODUCTION_DEPLOYMENT_GUIDE_V2.6.md"
echo ""
echo -e "${GREEN}🚀 祝部署顺利！${NC}"
