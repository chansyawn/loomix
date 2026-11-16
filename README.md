# 络米星集 loomix.fun

络米星集是非官方的星布谷地游戏工具与资料站，提供家具、服饰、生物、植物、烹饪和友邻等图鉴与资料查询。

网站：[loomix.fun](https://loomix.fun)。

## 本地开发

以下命令均在仓库根目录执行，使用仓库锁定的 Node 与 Vite+ 工具链：

```bash
vp install
```

启动前先准备网站资源，任选一种方式：

- 本地资源：按[客户端资源提取](tools/extraction/README.md)配置客户端，执行提取、验证与 materialize，将完整交付写入 `resources/website/`。已有共享交付时可直接 materialize。
- 已发布资源：在根目录环境文件中将 `VITE_RESOURCE_BASE_URL` 设为与当前契约兼容的 HTTPS release 地址；[网站资源指针](apps/website/release.json)记录了生产构建默认使用的地址。

开发和测试默认读取本地资源，首次克隆只有占位文件，需要先完成上述资源准备。随后启动网站：

```bash
vp run dev
```

提交前检查与 PR 流程见[贡献指南](CONTRIBUTING.md)。

### 环境配置

配置文件统一放在仓库根目录，模板见 [.env.example](.env.example)。尚未创建 `.env` 时复制模板，再填写所需变量；各 worktree 独立提供配置。子目录环境文件不加载，进程环境变量优先于文件配置。

| 使用方             | 读取的根目录文件                                         | 文件间优先级            |
| ------------------ | -------------------------------------------------------- | ----------------------- |
| 网站               | `.env`、`.env.local`、`.env.[mode]`、`.env.[mode].local` | 从左到右依次提高        |
| Wrangler 部署      | `.env`、可选的 `.env.local`                              | `.env.local` 优先       |
| 提取器、资源发布器 | `.env`                                                   | 不读取 local 或模式文件 |

`VITE_RESOURCE_BASE_URL` 默认无需配置：开发和测试使用 `resources/website/`，生产读取网站资源指针 `apps/website/release.json`。只有 `VITE_` 前缀变量可暴露给客户端，请勿为凭证使用该前缀。

## 目录结构

```text
apps/website/              # 网站页面、路由、样式与网站专属文档
packages/schema/           # 共享领域模型、资源与发布契约
tools/extraction/          # 客户端资源提取工具及原理说明
tools/resource-publisher/  # 不可变资源版本的校验与上传
resources/website/         # 当前 worktree 的本地网站资源
```

`LOOMIX_DATA_ROOT` 指定本机共享数据目录，保存只读客户端快照、工具缓存和验证产物；`resources/game-client/` 可作首次导入来源，`var/scratch/` 用于当前 worktree 的临时调查。`resources/` 与 `var/` 下的本地数据由根目录 `.gitignore` 忽略。完整产物布局见[客户端资源提取](tools/extraction/README.md#输入缓存与产物)。

## 文档

| 文档                                                   | 读者             | 内容                                             |
| ------------------------------------------------------ | ---------------- | ------------------------------------------------ |
| [贡献指南](CONTRIBUTING.md)                            | 贡献者           | 提交规范、PR 流程与合并限制                      |
| [Agent 协作约定](AGENTS.md)                            | AI Agent、维护者 | 注释语言、lint、文档、测试范围、React 与 UI 约定 |
| [CI/CD 与部署](DEPLOYMENT.md)                          | 维护者           | 预览、正式发布、资源与 CORS 配置                 |
| [网站应用](apps/website/README.md)                     | 网站开发者       | 开发入口、代码结构、数据加载与常用检查           |
| [发布契约检查](apps/website/docs/release-checks.md)    | 网站开发者       | 检查边界、接口、新增检查与失败处理               |
| [标签筛选策略](apps/website/docs/tag-filter-policy.md) | 网站开发者       | 白名单、可见性、分组与中文名清理                 |
| [客户端资源提取](tools/extraction/README.md)           | 提取工具使用者   | 配置、命令、缓存与产物                           |
| [提取原理](tools/extraction/extraction-method.md)      | 提取实现者       | 解码、来源关联、证据与验收                       |
| [资源发布](tools/resource-publisher/README.md)         | 资源维护者       | R2 凭证、dry-run 与上传                          |
| [共享数据契约](packages/schema/README.md)              | 各包开发者       | 领域语义、图片引用、发布格式与版本边界           |
