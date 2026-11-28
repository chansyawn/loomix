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

PR 需要先通过验证，再部署对应提交的构建产物并更新预览评论；必需检查名单由[贡献指南](CONTRIBUTING.md#合并限制)维护，触发条件与具体步骤以[预览工作流](.github/workflows/preview-website.yml)为准。预览验收包含资源访问与 CORS，避免只确认页面可打开而遗漏资源加载失败。Fork PR 不使用部署密钥，处理方式见[贡献指南](CONTRIBUTING.md#合并限制)。合并或关闭 PR 会自动删除预览并更新评论，重新打开后重新部署；同一 PR 的部署与清理串行执行，没有定时清理任务，回收失败时在 Actions 中重跑。

## 正式发布

PR 检查、正式部署与本地发布共用 `website#verify`，按任务定义的顺序执行资源检查、全仓代码检查与测试、网站构建、产物检查及部署 dry-run，任何一步失败都会停止。它需要访问已发布资源，不等同于提交前的 `ready`。

合并到 `master` 后，[Deploy website](.github/workflows/deploy-website.yml) 通过上述验证后发布到正式 Worker；正式站部署串行执行，也可在 GitHub **Actions → Deploy website → Run workflow** 手动触发。

如需本地发布，先完成 Wrangler 登录，或在根 `.env` 配置 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`。Wrangler 命令在仓库根目录执行，环境文件规则见[根 README](README.md#环境配置)，CI 使用 GitHub Secrets。`website#deploy` 只部署已有产物，日常发布使用以下完整流程：

```bash
vp install --frozen-lockfile
vp run website#release
```

只验证、不发布时运行 `vp run website#verify`；该任务及其远程检查、部署任务均禁用缓存，`website#release` 在验证通过后才执行部署。

## 资源发布与 CORS

生产构建默认读取网站资源地址配置，可通过 `VITE_RESOURCE_BASE_URL` 覆盖。部署要求使用已发布的 HTTPS 资源地址。[resource-address.json](apps/website/resource-address.json) · [根 README](README.md#环境配置)

网站资源地址配置和网站资源清单的结构见[共享数据契约](packages/schema/README.md#资料集图片与发布)。

### 资源更新流程

切换资源格式前，记录当前生产提交及正式站 `/resource-version.json` 指向的资源版本，供回滚使用。

1. 在当前工作区安装已验证的网站资源包。[客户端资源提取](tools/extraction/README.md#提取打包与本地安装)
2. 运行 `vp run resources publish` 发布资源。公网复核通过后，命令会更新网站资源地址。[网站资源管理](tools/resources/README.md#校验与发布)
3. 将 `apps/website/resource-address.json` 与配套的契约和网站代码一同提交到 PR。切换格式时移除仍指向旧版本的 `VITE_RESOURCE_BASE_URL` 覆盖。
4. 预览和正式部署前，工作流会校验线上资源，并核对构建产物 `/resource-version.json` 指向的版本、完成标记和清单。在 PR 预览中确认数据和图片可加载，再合并到 `master` 触发正式部署。

回滚时一并恢复记录的网站代码和资源地址，通过部署流程验证旧数据和图片仍可读取。清理旧版本前，按[网站资源管理](tools/resources/README.md#版本维护与清理)核对引用和宽限期。

检查资源域名的缓存规则。`/releases/*/_complete.json` 必须绕过 CDN 缓存，`/images/*.webp` 的成功响应应保留对象上的不可变缓存头，`404` 应绕过缓存，确保回收后重新发布的同一哈希能立即访问。

### CORS

R2 CORS 当前允许 `https://loomix.fun` 与 `https://*.preview.loomix.fun` 的 `GET`、`HEAD` 请求。

## 配置位置

工作流见 [.github/workflows](.github/workflows)，Worker、域名路由和预览配置见 [wrangler.jsonc](apps/website/wrangler.jsonc)，构建、校验及发布任务见 [vite.config.ts](apps/website/vite.config.ts)。必需检查与合并限制在 GitHub **Settings → Rules → Rulesets** 配置；部署凭证在仓库 Secrets；R2 自定义域名与 CORS 在 Cloudflare 控制台的 `loomix-assets` 存储桶设置。

Actions 使用自动提供的 `GITHUB_TOKEN` 读写预览评论，无需额外配置个人 GitHub token。Cloudflare 部署凭证与资源发布工具的 R2 S3 凭证用途不同；凭证不得提交到仓库。
