# 资源发布

在仓库根目录运行。本工具校验完整本地交付，并上传不可变资源版本；整体流程见[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)，概念边界见[领域术语表](../../GLOSSARY.md#资源发布)。下面示例使用的输入为 `resources/website/`，由其中的资源发布清单 `release.json` 描述，格式见[共享数据契约](../../packages/schema/README.md)。发布器验证领域引用图、资源覆盖、完整 WebP 像素与尺寸，并拒绝额外文件或符号链接。

## 配置凭证

在根目录 `.env` 中配置 `CLOUDFLARE_ACCOUNT_ID`、`R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY`，模板与读取规则见[根 README](../../README.md#环境配置)。`.env` 已被 Git 忽略，请勿提交凭证。

## 校验与发布

日常网站资源发布使用仓库级命令：

```sh
vp run resources:publish
```

它固定读取当前 worktree 的 `resources/website/`，执行完整资源校验与网站契约检查，上传至 `loomix-assets`，再从公共域名验证完成标记、文档、CORS 和一张代表图片，并重跑网站检查。全部通过后才更新本地 `apps/website/release.json`。提交、PR 预览与部署按[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)继续。网站的 `VITE_RESOURCE_BASE_URL` 覆盖值不改变此命令的输入或验证目标。

每个版本独立保存资源发布清单、领域文档和图片索引。图片字节按 SHA-256 存在共享的 `assets/` 前缀下，发布时验证已存在的对象，只上传缺失的图片。结果中的 `uploadedImageCount` 和 `reusedImageCount` 分别计数。图片使用长期不可变缓存，完成标记必须绕过缓存，因为部署前会用它确认该版本仍可用。

添加 `--dry-run` 可在不联网、无需凭证的情况下校验本地资源和网站契约，不创建发布锁、不占号、不修改指针。输出 ID 只是未预留的候选，正式发布时可能不同。

发布 ID 按 UTC 日期和资源清单自动生成，例如 `20261117-g0.95.2-f11-r001`。游戏版本与格式版本取自已验证清单；同一天、同游戏版本和格式版本下，通过 R2 原子预留依次占号，失败发布的号也保持占用，日内序号用尽后报错。日期与序号用于识别发布尝试，不表示完成时间；资源是否完整看完成标记，网站使用哪个版本看资源指针。格式版本仍独立表达契约，不随发布次数递增。生成约束见[命名实现](src/release-id.ts)。

只有校验与上传需求，或需要指定其他输入目录、bucket 时，使用底层发布器：

```sh
vp run @loomix/resource-publisher#publish \
  --content resources/website \
  --dry-run
vp run @loomix/resource-publisher#publish --content resources/website
```

底层命令不执行网站专属检查、不更新指针。`--content` 默认 `resources/website`，路径相对仓库根目录；`--bucket` 默认 `loomix-assets`。不再接受手动 `--release`。进度写入 stderr，最终结果 JSON 写入 stdout。完整参数见 [CLI](src/cli.ts)，上传与完成判定见[发布实现](src/publish.ts)。

## 失败处理

本地校验失败时先修复交付；若格式不匹配，按[客户端资源提取](../extraction/README.md)重新生成、验证并落地，不能只修改 `formatVersion`。正式上传会先预留 ID；预留后失败也不回收或续传。修复原因后重跑，工具自动选择下一个可用序号；仅明确的占号冲突会自动换号，网络和权限错误直接停止。不要删除 R2 预留标记绕过不可变约束。

上传完成但远程检查或指针更新失败时，旧指针保持原样，错误输出包含已上传资源的 URL、清单哈希和复核命令。修复后校验该已有版本，再通过 PR 更新指针即可。若共享图片已存在但完整性或元数据校验失败，检查报告的对象及其来源，确认正确字节后修复对象，保留原有哈希地址。

仓库级命令使用当前 worktree 的 `var/scratch/resources-publish.lock` 互斥。发布期间不要修改资源或指针，提交前发现指针已变化会拒绝覆盖；锁不能约束外部编辑器。指针通过原子替换提交，提交后的清理失败会报告“指针已更新”警告。

进程异常退出可能遗留锁和 `apps/website/.release-*.tmp`。先查看锁中的 PID 并确认原发布进程已结束，再删除该锁及确认属于该次发布的临时文件，随后重跑；工具不自动抢锁。不要把指针切到未确认完成或未通过网站检查的版本。

## 版本维护与清理

运行 `vp run resources:maintain list` 查看完成和退役时间。退役后保留 **30 天**，方便已打开的页面继续加载图片。准备一个非空 JSON 数组文件，列出实际生产和 PR 预览、待部署及计划用于回滚的资源发布 ID。新构建同时提供 `/resource-version.json`，可核对实际部署所用地址。确认版本已退出使用后执行 `retire`，重新启用前执行 `restore`，下次退役会重新计时。

```sh
vp run resources:maintain retire <release-id> --keep-file keep.json
vp run resources:maintain restore <release-id>
vp run resources:maintain gc --keep-file keep.json
vp run resources:maintain gc --keep-file keep.json --apply <plan-id>
```

在维护窗口内暂停发布、部署与回滚，等待在途任务结束，复核保护文件，再预演并使用输出的 `planId` 执行。执行时会重新计算计划，变化后需重新预演。清理先移除过期版本的完成标记和版本文件，再回收所有保留版本均未引用的共享图片。失败上传的文件和孤儿图片至少保留 **7 天**。占号标记保留，避免发布 ID 复用。若批量删除中断，重新预演后执行剩余计划。

不要为 `assets/` 配置按对象年龄删除的生命周期规则。R2 回收腾出源站空间，已缓存的响应仍可能在过期前可读。宽限期之后，长期未刷新的旧页面也可能无法加载先前未缓存的资源。
