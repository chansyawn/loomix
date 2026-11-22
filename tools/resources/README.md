# 网站资源管理

在仓库根目录运行 `vp run resources --help` 查看命令。资源发布和部署的完整流程见[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)，术语见[领域术语表](../../GLOSSARY.md#资源发布)。

脚本可通过 `node apps/website/scripts/resources-cli.ts <子命令>` 读取 stdout 上的 JSON 结果，检查明细和进度在 stderr。`vp run` 还会输出任务信息。

## 配置凭证

在根目录 `.env` 中配置 `CLOUDFLARE_ACCOUNT_ID`、`R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY`，模板与读取规则见[根 README](../../README.md#环境配置)。`.env` 已被 Git 忽略，请勿提交凭证。

## 校验与发布

```sh
vp run resources verify --local
vp run resources verify
vp run resources verify --url <资源版本地址>
vp run resources publish
```

`verify --local` 完整校验当前 worktree 的 `resources/website/` 和网站契约。远程校验会检查完成标记、文档、CORS、代表图片和网站契约。`verify` 默认按网站生产配置选版本，包括 `VITE_RESOURCE_BASE_URL` 覆盖。复核特定发布时用 `--url`。

`publish` 从当前 worktree 的 `resources/website/` 读取数据。它校验已安装的网站资源和网站契约，上传至 `loomix-assets`，通过公共域名复核后更新 `apps/website/resource-address.json`。[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)

每个版本独立保存网站资源清单、资料文档和图片索引。线上图片按 SHA-256 存在共享的 `images/` 前缀下。本地资源通过索引中的 `assets/` 相对路径读取图片。发布校验已存在的图片对象，只上传缺失的对象。结果中的 `uploadedImageCount` 和 `reusedImageCount` 分别计数。图片使用长期不可变缓存，完成标记必须绕过缓存，供部署前确认版本仍可用。

使用 `--dry-run` 可离线校验本地资源和网站契约。输出为未占号的候选 `releaseId`，正式发布时可能不同。

发布 ID 按 UTC 日期和网站资源清单自动生成，例如 `20261122-g0.95.2-f16-r001`。同一天、同游戏版本和格式版本下，通过 R2 原子预留依次占号。失败发布的号保持占用，日内序号用尽后报错。资源可用时间由完成标记确定，网站使用的版本由构建使用的资源地址决定。[命名实现](src/release-id.ts)

只需上传资源或需要指定输入目录、桶时使用 `upload`。

```sh
vp run resources upload --content resources/website --dry-run
vp run resources upload --content resources/website --bucket <桶>
```

`upload` 校验网站资源并上传。`publish` 还运行网站契约检查、公网复核和资源地址更新。`--content` 默认 `resources/website`，相对路径以仓库根目录为准。`--bucket` 默认 `loomix-assets`。

## 失败处理

本地资源格式不匹配时，重新生成、验证并安装资源包。正式上传会先预留 ID。仅占号冲突会自动换号，网络和权限错误会停止命令。修复后重跑，工具自动选用下一个序号。保留 R2 预留标记以确保 ID 唯一。[客户端资源提取](../extraction/README.md)

上传完成后若公网复核或地址更新失败，用错误输出中的 URL、清单哈希和命令复核该版本，通过后在 PR 中更新地址。若既有共享图片的完整性或元数据校验失败，检查报告对应的对象及来源，确认正确字节后修复对象，保留原有哈希地址。

仓库级命令使用当前 worktree 的 `var/scratch/resources-publish.lock` 互斥。安装、发布和人工编辑资源地址配置按顺序操作。地址文件原子替换前若发现外部编辑，命令会报错。

进程异常退出可能遗留锁和地址配置的临时文件。查看锁中的 PID 并确认发布进程已结束后，删除该锁及属于该次发布的临时文件，再重跑命令。

## 版本维护与清理

运行 `vp run resources list` 查看版本及完成时间。`gc` 默认只清理过期的未完成上传和孤儿图片。清理已完成版本时，用可重复的 `--release` 指定要删除的发布 ID。两个命令均可用 `--bucket` 指定目标桶。

指定前确认这些版本已退出生产和 PR 预览，且没有待部署或计划回滚的构建引用它们。可查看已部署网站的 `/resource-version.json` 核对实际资源地址。建议在版本退出使用后再保留 30 天，方便已打开的页面继续加载资源。`--release` 不检查这段宽限期。

升级格式期间暂停同桶的 `gc --apply`。新版回收器须读懂每个保留版本的清单和图片索引来保护共享图片。待旧格式版本全部退出使用并经过宽限期，在同一回收计划中用多个 `--release` 指明退役版本，再核对预演结果。

```sh
vp run resources gc
vp run resources gc --release <release-id>
vp run resources gc --release <release-id> --apply <plan-id>
```

在同一维护窗口内完成预演与执行。先暂停同桶的发布、上传和相关的部署、回滚，等待在途任务结束。执行时用相同参数加上输出的 `--apply <plan-id>`。工具会重算计划，变化后需重新预演。

清理依次删除完成标记、版本文件和孤儿图片。所有未指定删除的已完成版本都会保护其引用的共享图片。自动清理仅处理最后修改距今至少 7 天的未完成上传和孤儿图片。占号标记保留，避免发布 ID 复用。`gc --apply` 先输出计划，再执行删除，以退出码判断是否成功。若批量删除中断，用相同参数重新预演后执行剩余计划。

不要为 `images/` 配置按对象年龄删除的生命周期规则。R2 回收腾出源站空间，已缓存的响应仍可能在过期前可读。宽限期之后，长期未刷新的旧页面也可能无法加载先前未缓存的资源。
