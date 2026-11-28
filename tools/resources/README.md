# 网站资源管理

在仓库根目录运行 `vp run resources --help` 查看参数。脚本需要解析 JSON 时，直接调用 `node apps/website/scripts/resources-cli.ts <子命令>`，从 stdout 读取结果，进度和诊断在 stderr。

## 配置凭证

操作 R2 桶需要 `CLOUDFLARE_ACCOUNT_ID`、`R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY`，放在根目录 `.env` 或进程环境中。离线预演无需凭证。[根 README](../../README.md#环境配置)

## 校验与发布

| 任务                           | 命令                                           |
| ------------------------------ | ---------------------------------------------- |
| 校验已安装资源的文件与网站契约 | `vp run resources verify --local`              |
| 校验生产配置指向的版本         | `vp run resources verify`                      |
| 复核指定的线上版本             | `vp run resources verify --url <资源版本地址>` |
| 离线预演发布                   | `vp run resources publish --dry-run`           |
| 发布并更新网站资源地址         | `vp run resources publish`                     |

`publish` 读取当前 worktree 的 `resources/website/`，上传到 `loomix-assets`，通过公网复核后更新 [resource-address.json](../../apps/website/resource-address.json)。随后按[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)在 PR 中切换网站版本。

仅上传或要指定输入目录、目标桶时，用 `vp run resources upload --content <目录> --bucket <桶>`。相对目录以仓库根目录为准。`upload` 不运行网站专属检查，也不更新网站地址。`publish` 与 `upload` 的 `--dry-run` 只返回候选发布 ID，实际上传才占号。

## 失败处理

- **本地资源格式不匹配**时，重新生成并安装资源包，见[客户端资源提取](../extraction/README.md#提取打包与本地安装)。
- **上传中断**时，修正网络或权限问题后重跑，保留已分配的占号标记。若报共享图片校验失败，先核实对象的来源、字节和元数据，再修复原哈希地址的对象。
- **上传成功但地址未更新**时，用报错中的 URL 运行 `verify --url`，确认该版本 `_complete.json` 中的 `manifestSha256` 与报错给出的哈希相同。通过后可直接在 PR 中更新地址。
- **发布锁被占用**时，查看 `var/scratch/resources-publish.lock` 中的 PID。确认进程已退出后，再删除遗留锁及该次发布的临时文件。当前 worktree 的安装、发布与手工编辑地址应错开。

## 版本维护与清理

用 `vp run resources list` 查看版本及完成时间。`gc` 默认预演清理最后修改距今至少 7 天的未完成上传和孤儿图片。删除已完成版本须显式传 `--release`，多个版本可重复传参。`list` 和 `gc` 均可用 `--bucket` 指定桶。

1. 从正式站与活跃预览的 `/resource-version.json` 核对实际引用，也要核对待部署和准备回滚的构建。版本退出使用后建议保留 30 天，让已打开的页面仍能加载图片。这段宽限期由维护者核对，`--release` 可直接指定版本。
2. 在同一维护窗口暂停目标桶的发布、上传和相关部署、回滚，等在途任务结束。资源格式升级期间暂停 `gc --apply`，直到回收器能读懂所有保留版本的清单和图片索引。已过宽限期的旧格式版本应在同一计划中指定。
3. 预演后核对版本、对象和字节数，再以相同参数加上返回的 `--apply <plan-id>` 执行。计划变化或删除中断时重新预演，以执行命令的退出码确认完成。

```sh
vp run resources gc --release <release-id>
vp run resources gc --release <release-id> --apply <plan-id>
```

各版本共用 `images/` 下按哈希存放的图片，不要为该目录配置按对象年龄删除的生命周期规则。回收释放的是源站空间，已缓存的响应可能持续到过期。
