# 使用官方的 Node.js 20 LTS 镜像作为基础
FROM node:20

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json (如果存在)
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制项目文件和目录到工作目录
COPY . .

# 暴露应用程序正在运行的端口
EXPOSE 3000

# 启动应用程序的命令
CMD [ "node", "app.js" ]
