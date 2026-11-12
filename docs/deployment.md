# CI/CD 与部署

网站运行于 Cloudflare Worker `loomix-website`，由 GitHub Actions 构建、校验和部署。

## 环境与域名

| 用途     | 地址                                               | 行为                                |
| -------- | -------------------------------------------------- | ----------------------------------- |
| 正式站   | `https://loomix.fun`                               | `master` 更新后自动部署             |
| PR 预览  | `https://pr-<编号>.preview.loomix.fun`             | 同一 PR 更新时沿用地址，公开访问    |
| 游戏资源 | `https://assets.loomix.fun/releases/<release-id>/` | R2 不可变资源版本，正式站与预览共用 |

预览使用 Cloudflare Workers Previews，并通过 `X-Robots-Tag: noindex` 告知搜索引擎不收录；这不限制公开访问。`workers.dev` 入口已关闭，正式站根域名不承载预览路由。

## PR 检查与预览

向 `master` 打开、重新打开 PR 或推送提交时，运行以下必需检查：

| 检查                | 内容                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `Validate PR title` | 校验 Conventional Commits 标题；编辑 PR 标题时也会运行                                                   |
| `Verify website`    | 锁定依赖安装、线上资源完整性校验、`vp check`、全仓测试、网站构建、静态资源边界校验及 Worker 部署 dry-run |
| `Preview website`   | 等待本次验证成功，部署本次构建产物，验证预览后更新 PR 评论                                               |

预览部署会核对 PR 提交与构建身份，避免发布过期产物。HTTP 验收覆盖首页 HTML、静态图片及 `noindex`，并使用真实预览 Origin 验证资源完整性和 CORS。Fork PR 不使用部署密钥发布预览，处理方式见 [贡献指南](../CONTRIBUTE.md)。

PR 合并或关闭时自动删除预览，并更新原评论；重新打开后重新部署。同一 PR 的部署与清理串行执行。目前没有定时清理任务，不依赖自动到期回收；若回收失败，在 Actions 中重跑失败的清理任务。

## 正式发布

合并到 `master` 后，[Deploy website](../.github/workflows/deploy-website.yml) 重新执行资源校验、代码检查、测试、构建、产物校验和部署 dry-run，通过后发布到正式 Worker。生产部署串行执行。

也可在 GitHub **Actions → Deploy website → Run workflow** 手动触发，选择 `master`。

如需本地发布，先完成 Wrangler 登录或配置 Cloudflare 凭证，再在仓库根目录运行完整发布流程：

```bash
vp install --frozen-lockfile
vp run website#release
```

`website#deploy` 只部署已有产物；日常发布使用上述完整流程，避免跳过校验或部署旧构建。

## 资源发布与 CORS

生产构建默认从 [apps/website/release.json](../apps/website/release.json) 读取资源版本；`VITE_RESOURCE_BASE_URL` 可覆盖该地址。部署要求使用已发布的 HTTPS 资源版本，本地资源目录不能用于发布。

游戏数据与图片由 [资源发布工具](../tools/resource-publisher/README.md) 单独上传至 R2 `loomix-assets`，不随网站 CI 自动上传。更新资源时，先发布新的不可变 release，再通过 PR 更新网站的 `release.json`。

R2 CORS 当前允许以下 Origin 的 `GET`、`HEAD` 请求：

- `https://loomix.fun`
- `https://*.preview.loomix.fun`

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
