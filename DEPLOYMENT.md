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

生产构建默认从[网站资源指针](apps/website/release.json)读取资源地址，`VITE_RESOURCE_BASE_URL` 可覆盖；变量默认行为见[根 README](README.md#环境配置)。部署要求使用已发布的 HTTPS 资源版本，本地资源目录不能用于发布。

网站资源指针与资源发布清单的文件位置和结构见[共享数据契约](packages/schema/README.md#快照图片与发布)，概念边界见[领域术语表](GLOSSARY.md#资源发布)。

### 资源更新流程

1. **提取与落地**：按[客户端资源提取](tools/extraction/README.md#提取与交付)执行 refresh、完整链 verify 与 materialize，得到当前 worktree 的本地交付。
2. **发布资源**：运行 `vp run resources:publish`，自动检查本地资源与网站契约、分配发布 ID、上传 R2，并在远程检查通过后更新本地网站资源指针。操作前可加 `--dry-run` 做离线检查；参数、占号规则和失败恢复由[资源发布](tools/resource-publisher/README.md#校验与发布)维护。若报告标签问题，按[标签筛选策略](apps/website/docs/tag-filter-policy.md#维护与检查)调整配置，并完成人工验收。网站 CI 不自动上传游戏数据与图片。
3. **提交指针**：通过 PR 提交 `apps/website/release.json`，连同必要的契约和网站代码变更一起提交；资源格式须与当前共享契约兼容。
4. **预览与部署**：CI 的 `verify-release` 校验指针所选的已发布资源并运行发布契约检查。正式和预览部署在切换前校验构建产物实际绑定的完成标记。预览验收通过后合并，由正式发布流程部署。

仓库级命令在上传前后运行同一套网站检查；底层资源发布器只负责目录、字节与上传完整性。部署仍独立执行发布契约检查，操作入口与失败恢复由上述工具文档维护。

切换共享图片布局时，先通过新版发布器生成资源版本，再把新版网站和新指针一起部署。首次切换会更换图片 URL。保留旧构建及与其配对的资源版本，退出使用后按[资源发布](tools/resource-publisher/README.md#版本维护与清理)清理。

检查资源域名的缓存规则。`/releases/*/_complete.json` 必须绕过 CDN 缓存，`/images/*.webp` 的成功响应应保留对象上的不可变缓存头，`404` 应绕过缓存，确保回收后重新发布的同一哈希能立即访问。

### CORS

R2 CORS 当前允许 `https://loomix.fun` 与 `https://*.preview.loomix.fun` 的 `GET`、`HEAD` 请求。

## 配置位置

工作流见 [.github/workflows](.github/workflows)，Worker、域名路由和预览配置见 [wrangler.jsonc](apps/website/wrangler.jsonc)，构建、校验及发布任务见 [vite.config.ts](apps/website/vite.config.ts)。必需检查与合并限制在 GitHub **Settings → Rules → Rulesets** 配置；部署凭证在仓库 Secrets；R2 自定义域名与 CORS 在 Cloudflare 控制台的 `loomix-assets` 存储桶设置。

Actions 使用自动提供的 `GITHUB_TOKEN` 读写预览评论，无需额外配置个人 GitHub token。Cloudflare 部署凭证与资源发布工具的 R2 S3 凭证用途不同；凭证不得提交到仓库。
