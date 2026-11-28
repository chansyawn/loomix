# CI/CD 与部署

网站部署到 Cloudflare Worker `loomix-website`。正式站与 PR 预览共用 R2 上按版本发布的数据和图片。

## PR 检查与预览

[预览工作流](.github/workflows/preview-website.yml)部署通过验证的构建，并在 PR 评论中更新 `https://pr-<编号>.preview.loomix.fun`。地址公开可访问，同一 PR 更新后继续使用。验收时打开图鉴详情，确认资料和图片都能加载。Fork PR 需要先转为同仓库分支，见[贡献指南](CONTRIBUTING.md#提交-pr)。

关闭或合并 PR 后自动回收预览。回收失败时在 Actions 中重跑[预览清理工作流](.github/workflows/preview-cleanup.yml)。

## 正式发布

合并到 `master` 后，[Deploy website](.github/workflows/deploy-website.yml) 自动验证并部署到 `https://loomix.fun`。手动重新部署可在 GitHub **Actions → Deploy website → Run workflow** 触发。

本地发布前先登录 Wrangler，或在根目录 `.env` 设置 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_API_TOKEN`。CI 从 GitHub Secrets 读取这两个变量。本地发布命令在仓库根目录运行。

```sh
vp install --frozen-lockfile
vp run website#release
```

仅验证时运行 `vp run website#verify`。它需要访问已发布的 HTTPS 资源，检查构建产物并执行部署 dry-run。`website#deploy` 直接部署已有产物。各任务见[网站任务配置](apps/website/vite.config.ts)。

## 资源更新流程

1. 切换资源格式前，记下当前生产提交及正式站 `/resource-version.json` 中的地址，留作回滚。
2. 按[客户端资源提取](tools/extraction/README.md#提取打包与本地安装)安装本地资源，再按[网站资源管理](tools/resources/README.md#校验与发布)发布。公网复核通过后，发布命令会更新 [resource-address.json](apps/website/resource-address.json)。
3. 将地址文件与配套的契约、网站改动一同提交 PR。移除仍指向旧版本的 `VITE_RESOURCE_BASE_URL` 覆盖，在预览中验收数据与图片后合并。

回滚时一并恢复记录的网站代码和资源地址，部署后复核旧数据与图片。回收旧资源前核对在用版本和宽限期，见[网站资源管理](tools/resources/README.md#版本维护与清理)。

## 资源域名与 CORS

Worker 域名和预览路由在 [wrangler.jsonc](apps/website/wrangler.jsonc) 配置。资源域名 `assets.loomix.fun` 与 CORS 在 Cloudflare 的 `loomix-assets` 桶设置，允许 `https://loomix.fun` 和 `https://*.preview.loomix.fun` 的 `GET`、`HEAD` 请求。

为资源域名配置 CDN 时，让 `/releases/*/_complete.json` 绕过缓存。`/images/*.webp` 的成功响应应保留对象上的不可变缓存头，`404` 须绕过缓存，以便图片回收并重新发布后能立即访问。
