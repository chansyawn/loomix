# 络米星集 loomix.fun

[络米星集](https://loomix.fun)是《星布谷地》的非官方工具与资料站，提供家具、服饰、生物、植物、烹饪和友邻等图鉴与资料查询。

## 本地开发

在仓库根目录运行 `vp install` 安装依赖。Node 与包管理器版本由 [package.json](package.json) 指定。

首次克隆只有资源占位文件。启动网站前可选择本地或已发布的资源。

- 使用**本地资源**时，将兼容的资源包安装到 `resources/website/`。首次提取从[客户端资源提取](tools/extraction/README.md#首次配置)开始。
- 使用**已发布资源**时，在根目录 `.env.development.local` 中将 `VITE_RESOURCE_BASE_URL` 设为兼容的 HTTPS 发布地址。资源域名的 CORS 须允许当前开发站点访问。

运行 `vp run dev`，打开终端输出的网址。`vp run test` 运行全仓测试，`vp run build` 构建所有提供构建任务的包。单包任务使用 `vp run <包名>#<任务>`。

### 环境配置

环境文件放在当前 worktree 的仓库根目录，进程环境变量优先。需要 `.env` 时从 [.env.example](.env.example) 复制并填写。凭证应避开会暴露给客户端的 `VITE_` 前缀。

| 使用方          | 读取的文件（从低到高优先级）                             |
| --------------- | -------------------------------------------------------- |
| 网站            | `.env`、`.env.local`、`.env.[mode]`、`.env.[mode].local` |
| Wrangler 部署   | `.env`、`.env.local`                                     |
| 提取器、R2 凭证 | `.env`                                                   |

未设置 `VITE_RESOURCE_BASE_URL` 时，开发和测试使用本地资源，生产构建读取 [resource-address.json](apps/website/resource-address.json)。

### T3 Worktree

在 T3 的 **Settings → Projects → Actions** 导入 [t3.json](t3.json)。在主 checkout 的 `.env` 中设置 `LOOMIX_DATA_ROOT`，需要发布资源时也在这里配置发布凭证。新 worktree 缺少 `.env` 时，「初始化 Worktree」会整份复制该文件。

初始化在后台安装依赖、准备并校验本地资源。依赖就绪后即可运行「启动网站」，资料要等资源就绪才可用。如果没有匹配的快照，导入所需版本后重跑初始化。如果有多个匹配，指定快照生成并安装资源包，再重跑初始化。[客户端资源提取](tools/extraction/README.md#首次配置)

## 文档

| 文档                                                               | 何时阅读                               |
| ------------------------------------------------------------------ | -------------------------------------- |
| [贡献指南](CONTRIBUTING.md)                                        | 提交变更、验收预览或合并 PR            |
| [Agent 协作约定](AGENTS.md)                                        | 确认代码、文档、UI 与测试约定          |
| [领域术语表](GLOSSARY.md)                                          | 区分收录范围、游戏关系与资源产物       |
| [CI/CD 与部署](DEPLOYMENT.md)                                      | 部署网站、切换或回滚线上资源           |
| [网站应用](apps/website/README.md)                                 | 接入页面、读取数据或排查网站问题       |
| [发布契约检查](apps/website/docs/release-checks.md)                | 运行、扩展或排查网站对资源的检查       |
| [标签筛选策略](apps/website/docs/tag-filter-policy.md)             | 调整标签的可见范围、分组或名称         |
| [客户端资源提取](tools/extraction/README.md)                       | 导入快照、提取资料、安装或恢复本地资源 |
| [提取要求与规范](tools/extraction/docs/extraction-requirements.md) | 修改提取规则或验收逻辑                 |
| [业务确认与调查](tools/extraction/docs/business-investigation.md)  | 复核准入依据、版本证据与待确认事项     |
| [网站资源管理](tools/resources/README.md)                          | 校验、发布或清理 R2 资源               |
| [共享数据契约](packages/schema/README.md)                          | 修改跨包数据结构或校验规则             |
