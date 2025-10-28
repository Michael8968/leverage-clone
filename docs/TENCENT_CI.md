# 在腾讯云 CI / CloudBase 上的构建与部署指引

本文档给出把本仓库在腾讯云环境（CloudBase CI / 自建 CI）上构建并产出可部署 `.deploy` 的标准化步骤。目标：在 CI 中执行构建、校验 `.deploy` 包含运行时依赖（例如 `@cloudbase/node-sdk`），并打包 `.deploy.zip` 作为构建产物，最后把产物部署到生产主机或容器。

## 前提
- 仓库已包含以下脚本：
  - `scripts/ci/tencent-build.sh`（Linux CI 使用）
  - `scripts/ci/tencent-build.ps1`（Windows Runner 使用）
  - `scripts/check-deploy.js`（用于校验 `.deploy` 是否包含关键依赖）
- 你的项目使用 Node.js 20（Dockerfile 与 CI 配置假设 node 20）。

## 在 Tencent Cloud CI（或任意 Linux Runner）中运行（示例）
在构建步骤中，添加以下命令：

```bash
# 确保脚本可执行
chmod +x scripts/ci/tencent-build.sh
# 运行构建/打包/校验流程
./scripts/ci/tencent-build.sh
```

脚本会完成：
1. `npm ci`（安装所有依赖）
2. `npm run build`（构建 next）
3. 准备 `.deploy`（将 standalone 输出、public、package.json 复制进去）
4. 在 `.deploy` 中执行 `npm ci --production`（确保运行时依赖存在）
5. 运行 `node scripts/check-deploy.js .deploy` 做基本校验
6. 生成 `.deploy.zip`（打包产物）

如果任一步失败，脚本会以非 0 退出，导致构建失败 —— 这是预期行为，用来阻止错误产物被部署到生产。

## 在 CloudBase 控制台配置（快速步骤）
1. 登录腾讯云 CloudBase 控制台 -> 你的应用 -> 持续集成/持续部署（或构建配置）。
2. 在“构建命令”或“自定义脚本”区域，新增一个构建步骤：

- 环境：选择 Linux runner（Ubuntu）
- 构建命令（示例）：
  ```bash
  chmod +x scripts/ci/tencent-build.sh
  ./scripts/ci/tencent-build.sh
  ```

3. 将 `.deploy.zip` 作为构建产物（如果控制台支持 artifact），或在构建结束后将 `.deploy` 目录通过 scp/rsync 同步到你的 CVM（生产主机）。

## 把产物部署到 CVM（示例）
假设你在 CI 机器上生成了 `.deploy.zip`，并把其上传到生产服务器 `/home/deploy`，在服务器上运行：

```bash
cd /home/deploy
# 备份旧部署
mv .deploy .deploy.bak.$(date +%s) || true
# 解压上传的包
unzip -q .deploy.zip -d .deploy
cd .deploy
# （可选）在目标机再次安装 production 依赖
npm ci --production
# 重启 node 服务（systemd 示例）
sudo systemctl restart leverage
# 查看日志
sudo journalctl -u leverage -n 200 --no-pager
```

如果你使用 pm2：

```bash
pm2 restart leverage
pm2 logs leverage --lines 200
```

如果使用容器部署，请把 `.deploy` 中的必要文件放入镜像并构建新镜像，或直接把 `.deploy` 作为挂载目录运行容器（按你的架构选择）。

## Docker 镜像部署注意
项目的 `Dockerfile` 已被更新以把 production node_modules 从构建阶段复制到 runtime 阶段：

```dockerfile
# runtime stage
COPY --from=deps /app/node_modules ./node_modules
```

如果你采用镜像方式部署，请按 Dockerfile 的多阶段流程构建并推送镜像：

```bash
# 在 CI 中
docker build -t yourrepo/leverage:latest .
docker push yourrepo/leverage:latest
# 在生产机上拉取并重启容器
docker pull yourrepo/leverage:latest
docker stop leverage-app || true
docker rm leverage-app || true
docker run -d --name leverage-app -p 3000:3000 --env-file /path/to/.env yourrepo/leverage:latest
```

## 自动化建议
- 在 CI 中把 `node scripts/check-deploy.js .deploy` 作为必要步骤，任何校验失败都应阻止发布。
- 可以在 CI 中把 `.deploy.zip` 上传到私有文件存储（或云对象存储），并在生产端通过脚本从该位置下载并部署。

## 常见问题与调试
- 如果生产上仍然报 `Cannot find module '@cloudbase/node-sdk'`：
  - 检查生产目录下的 `node_modules/@cloudbase/node-sdk` 是否存在；
  - 确认 `npm ci --production` 是否在目标机或 `.deploy` 中运行过；
  - 如果使用 Docker，确认镜像构建阶段确实把 node_modules 复制到了 runtime。

- 如果 CI 报 chmod 权限问题，确保 Runner 使用的是 Linux 并且有执行权限，或直接在 CI 命令里用 `bash scripts/ci/tencent-build.sh` 调用脚本。

---

如果你告诉我你在腾讯云上使用的是哪一个具体服务（CloudBase 控制台的“持续集成”/Tencent Cloud CI，或使用 CODING/自建 Jenkins），我可以把上面的步骤转换为更具体的配置模板（例如 CloudBase 控制台的“构建步骤” JSON 或 CODING 的流水线 YAML）。
