# CI/CD 与部署

网站运行于 Cloudflare Worker `loomix-website`，由 GitHub Actions 构建、校验和部署。

## 环境与域名

| 用途     | 地址                                               | 行为                                |
| -------- | -------------------------------------------------- | ----------------------------------- |
| 正式站   | `https://loomix.fun`                               | `master` 更新后自动部署             |
| PR 预览  | `https://pr-<编号>.preview.loomix.fun`             | 同一 PR 更新时沿用地址，公开访问    |
| 游戏资源 | `https://assets.loomix.fun/releases/<release-id>/` | R2 不可变资源版本，正式站与预览共用 |

预览使用 Cloudflare Workers Previews，`X-Robots-Tag: noindex` 不阻止公开访问；`workers.dev` 入口和根域名预览路由均已关闭。

## PR 检查与预览

向 `master` 打开、重新打开 PR 或推送提交时，运行以下必需检查：

| 检查                | 内容                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `Validate PR title` | 校验 Conventional Commits 标题；编辑 PR 标题时也会运行                                                   |
| `Verify website`    | 锁定依赖安装、线上资源完整性校验、`vp check`、全仓测试、网站构建、静态资源边界校验及 Worker 部署 dry-run |
| `Preview website`   | 等待本次验证成功，部署本次构建产物，验证预览后更新 PR 评论                                               |

预览部署会核对 PR 提交与构建身份，避免发布过期产物；HTTP 验收覆盖首页 HTML、静态图片和 `noindex`，并用真实预览 Origin 验证资源完整性与 CORS。Fork PR 不使用部署密钥，处理方式见[贡献指南](../CONTRIBUTING.md)。合并或关闭 PR 会自动删除预览并更新评论，重新打开后重新部署；同一 PR 的部署与清理串行执行，没有定时清理任务，回收失败时在 Actions 中重跑。

## 正式发布

合并到 `master` 后，[Deploy website](../.github/workflows/deploy-website.yml) 重新执行与 `Verify website` 相同的校验和部署 dry-run，通过后发布到正式 Worker；生产部署串行执行，也可在 GitHub **Actions → Deploy website → Run workflow** 手动触发。

如需本地发布，先完成 Wrangler 登录，或在根 `.env` 配置 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`。Wrangler 命令在仓库根目录执行，读取根 `.env` 和可选的 `.env.local`；进程环境变量优先，CI 使用 GitHub Secrets。`website#deploy` 只部署已有产物，日常发布使用以下完整流程：

```bash
vp install --frozen-lockfile
vp run website#release
```

## 资源发布与 CORS

生产构建默认从 [apps/website/release.json](../apps/website/release.json) 读取资源版本；`VITE_RESOURCE_BASE_URL` 可覆盖该地址。部署要求使用已发布的 HTTPS 资源版本，本地资源目录不能用于发布。

- **发布流程**：游戏数据与图片由[资源发布工具](../tools/resource-publisher/README.md)单独上传至 R2 `loomix-assets`，不随网站 CI 自动上传。先发布新的不可变 release，再通过 PR 更新网站的 `release.json`。
- **检查门禁**：更新本地资源后，按[全部页标签筛选策略](../apps/website/docs/tag-filter-policy.md)运行 `vp run --no-cache website#verify-contracts` 并处理人工维护项。部署链路中的 `verify-release` 对 `release.json` 指向的已发布 release 运行同一套[发布契约检查](../apps/website/docs/release-checks.md)；资源上传本身仍由发布工具的 `validateContent` 负责，发布契约检查阻断的是网站部署。

R2 CORS 当前允许 `https://loomix.fun` 与 `https://*.preview.loomix.fun` 的 `GET`、`HEAD` 请求。

## 配置位置

| 配置                                            | 位置                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| PR 标题、预览、回收、正式发布工作流             | [.github/workflows](../.github/workflows)                            |
| Worker、域名路由和预览配置                      | [apps/website/wrangler.jsonc](../apps/website/wrangler.jsonc)        |
| 构建、校验及发布任务                            | [apps/website/vite.config.ts](../apps/website/vite.config.ts)        |
| 必需检查与合并限制                              | GitHub **Settings → Rules → Rulesets**                               |
| `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN` | GitHub **Settings → Secrets and variables → Actions** 的仓库 Secrets |
| R2 自定义域名与 CORS                            | Cloudflare 控制台的 `loomix-assets` 存储桶设置                       |

Actions 使用自动提供的 `GITHUB_TOKEN` 读写预览评论，无需额外配置个人 GitHub token。Cloudflare 部署凭证与资源发布工具的 R2 S3 凭证用途不同；凭证不得提交到仓库。
