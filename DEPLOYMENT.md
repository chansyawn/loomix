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

1. 运行 `refresh`、`verify` 和 `install-resources`，得到当前工作区的网站资源。[客户端资源提取](tools/extraction/README.md#提取打包与本地安装)
2. 运行 `vp run resources publish` 校验、上传 R2 并在远程检查通过后更新网站资源地址配置。可先加 `--dry-run` 做离线检查。若报告标签问题，调整配置并完成人工验收。[网站资源管理](tools/resources/README.md#校验与发布) · [标签筛选策略](apps/website/docs/tag-filter-policy.md#维护与检查)
3. 将 `apps/website/resource-address.json` 与相同格式的契约和网站代码一同提交到 PR。格式切换时移除环境中指向旧版本的 `VITE_RESOURCE_BASE_URL` 覆盖。
4. `verify-release` 校验配置选择的线上资源及网站契约。预览和正式部署前检查构建产物的 `/resource-version.json`，核对配置地址与该版本的完成标记及清单。预览验收通过后合并，由正式发布流程部署。

仓库级命令在上传前后运行同一套网站检查；底层资源发布器只负责目录、字节与上传完整性。部署仍独立执行发布契约检查，操作入口与失败恢复由上述工具文档维护。

格式切换前记录生产提交及其 `/resource-version.json` 所指向的版本。需要回滚时一并恢复网站代码和原资源地址，通过部署流程验证网站仍能读取原数据和图片。旧格式资源退出使用后再执行清理。[网站资源管理](tools/resources/README.md#版本维护与清理)

检查资源域名的缓存规则。`/releases/*/_complete.json` 必须绕过 CDN 缓存，`/images/*.webp` 的成功响应应保留对象上的不可变缓存头，`404` 应绕过缓存，确保回收后重新发布的同一哈希能立即访问。

### CORS

R2 CORS 当前允许 `https://loomix.fun` 与 `https://*.preview.loomix.fun` 的 `GET`、`HEAD` 请求。

## 配置位置

工作流见 [.github/workflows](.github/workflows)，Worker、域名路由和预览配置见 [wrangler.jsonc](apps/website/wrangler.jsonc)，构建、校验及发布任务见 [vite.config.ts](apps/website/vite.config.ts)。必需检查与合并限制在 GitHub **Settings → Rules → Rulesets** 配置；部署凭证在仓库 Secrets；R2 自定义域名与 CORS 在 Cloudflare 控制台的 `loomix-assets` 存储桶设置。

Actions 使用自动提供的 `GITHUB_TOKEN` 读写预览评论，无需额外配置个人 GitHub token。Cloudflare 部署凭证与资源发布工具的 R2 S3 凭证用途不同；凭证不得提交到仓库。
