# 通知：已对 `feature/Leverage1028` 分支进行历史清理并强制推送

重要性：高

发生了什么
- 我们检测到仓库中包含一个明文的云密钥（在 `PRODUCTION_DEPLOYMENT_GUIDE_V2.6.md` 中）。为消除风险，我们在本地对 `feature/Leverage1028` 分支进行了历史重写，移除了该文件在历史提交中的所有痕迹，并将清理后的分支使用强制推送（force-push）上传到远端 `origin`。

为什么需要你关注
- 由于远端历史被改写（force-push），你本地的 `feature/Leverage1028` 分支如果存在，需要按下面步骤同步为远端的新历史，否则会出现合并/提交冲突或误推。该操作同时意味着旧历史（含泄露内容）在本地与远端都已尽最大努力删除，但请务必确认你/你的团队已在云服务控制台撤销/轮换被泄露的密钥。只有密钥在服务端被撤销，才能消除被滥用风险。

你需要做的事（最简单、安全的流程）
1) 保存或处理未提交的工作（如果有）

   - 推荐先 stash：

```powershell
git stash push -m "work-before-history-rewrite"
```

   - 或者把改动另存为 patch：

```powershell
git diff > ~/my-uncommitted-work.patch
```

2) 获取远端更新并重置你的本地分支到新的远端历史：

```powershell
git fetch origin
git checkout feature/Leverage1028
git reset --hard origin/feature/Leverage1028
```

3) 恢复你的未提交工作（如果你使用了 stash）：

```powershell
git stash pop
# 若出现冲突，请按常规 git 冲突解决流程处理
```

替代（如果你不想 hard-reset）
- 你也可以选择重新 clone 仓库，这是最干净的方式：

```powershell
rm -rf leverage-clone
git clone https://github.com/Angus1976/leverage-clone.git
cd leverage-clone
git checkout feature/Leverage1028
```

关于已撤销/轮换密钥
- 我们建议并请你确认：已在腾讯云控制台（或相关云控制面板）撤销/轮换所有被泄露的密钥。即使仓库历史被清理，若密钥仍有效仍存在滥用风险。请把撤销/轮换的确认回报给团队安全负责人。

谁来联系？
- 如果你在执行上述操作时遇到问题，可以联系仓库管理员：Angus1976（或通过团队 Slack/邮件）。我也可以协助各位按需完成 reset/clone/冲突解决。

更多说明与背景
- 被删除文件： `PRODUCTION_DEPLOYMENT_GUIDE_V2.6.md`（已替换为脱敏模板）。
- 备份：在开始历史改写前，我们已在仓库中创建了分支级备份 bundle（文件名示例：`feature-Leverage1028.pre-clean.bundle`），如需回滚可联系管理员索取备份。

感谢你的配合 — 这能确保我们把变更安全地推进到生产环境。

—— DevOps 团队
