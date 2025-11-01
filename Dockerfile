
# 1. 使用官方的 Node.js 20 长期支持版 (LTS) 作为基础镜像
FROM node:20-alpine

# 2. 在容器中设置工作目录
WORKDIR /usr/src/app

# 3. 复制 package.json 和 package-lock.json 到工作目录
#    通过分离这一步，我们可以利用Docker的层缓存机制，
#    只有在依赖项发生变化时才重新执行 npm install。
COPY package*.json ./

# 4. 安装项目依赖
RUN npm install --production

# 5. 将应用的其余源代码复制到工作目录
COPY . .

# 6. 暴露应用运行的端口
EXPOSE 3000

# 7. 定义容器启动时执行的命令
CMD [ "node", "app.js" ]
