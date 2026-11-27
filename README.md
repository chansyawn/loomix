# 络米星集 loomix.fun

络米星集是非官方的星布谷地游戏工具与资料站，提供家具、服饰、生物、植物、烹饪和友邻等图鉴与资料查询。

网站：[loomix.fun](https://loomix.fun)。

## 本地开发

以下命令均在仓库根目录执行。本地与 CI 使用根 `package.json` 的 `devEngines` 选择 Node 和包管理器，Vite+ 版本由工作区依赖与锁文件固定：

```bash
vp install
```

启动前先准备网站资源，任选一种方式：

- 本地资源可提取、打包和验证后安装到 `resources/website/`。已有共享资源包时可直接安装。[客户端资源提取](tools/extraction/README.md)
- 已发布资源通过 `VITE_RESOURCE_BASE_URL` 指定与当前契约匹配的 HTTPS 地址。生产默认使用网站资源地址配置。[resource-address.json](apps/website/resource-address.json)

开发和测试默认读取本地资源，首次克隆只有占位文件，需要先完成上述资源准备。随后启动网站：

```bash
vp run dev
```

日常使用 `vp run test` 运行全仓测试，`vp run build` 构建所有提供构建任务的包；只操作一个包时使用 `vp run <包名>#<任务>`。测试默认执行一次，持续监听可运行 `vp run website#test watch`。提交前检查与 PR 流程见[贡献指南](CONTRIBUTING.md)。

安装本地资源后，使用 `vp run resources publish` 校验、上传并更新网站资源地址配置，随后通过 PR 预览与部署。[网站资源管理](tools/resources/README.md) · [CI/CD 与部署](DEPLOYMENT.md#资源更新流程)

### 环境配置

配置文件统一放在仓库根目录，模板见 [.env.example](.env.example)。尚未创建 `.env` 时复制模板，再填写所需变量；各 worktree 独立提供配置。子目录环境文件不加载，进程环境变量优先于文件配置。

| 使用方             | 读取的根目录文件                                         | 文件间优先级            |
| ------------------ | -------------------------------------------------------- | ----------------------- |
| 网站               | `.env`、`.env.local`、`.env.[mode]`、`.env.[mode].local` | 从左到右依次提高        |
| Wrangler 部署      | `.env`、可选的 `.env.local`                              | `.env.local` 优先       |
| 提取器、资源发布器 | `.env`                                                   | 不读取 local 或模式文件 |

`VITE_RESOURCE_BASE_URL` 默认无需配置。开发和测试使用 `resources/website/`，生产读取 `apps/website/resource-address.json`。只有 `VITE_` 前缀变量可暴露给客户端，请勿为凭证使用该前缀。

### T3 Worktree

在 T3 的 **Settings → Projects → Actions** 导入 [t3.json](t3.json) 中的动作。在主 checkout 根目录创建 `.env.worktree.local`，填入本机的 `LOOMIX_DATA_ROOT`。模板只放 worktree 所需的配置，发布凭证留在主 checkout 的 `.env` 中。

「初始化 Worktree」会安装依赖，并在 worktree 缺少 `.env` 时复制模板。「启动网站」优先使用通过校验的本地网站资源，必要时复用或生成与当前 checkout 匹配的共享资源包并安装，再启动开发服务器。访问地址以终端输出为准。资源准备若提示客户端快照缺失或选择歧义，按[客户端资源提取](tools/extraction/README.md#首次配置)处理后重试。

## 目录结构

```text
apps/website/              # 网站页面、路由、样式与网站专属文档
packages/schema/           # 共享领域模型、资源与发布契约
tools/extraction/          # 客户端资源提取工具及要求与维护说明
tools/resources/  # 资源校验、发布与清理
resources/website/         # 当前 worktree 的本地网站资源
```

`LOOMIX_DATA_ROOT` 指定本机共享数据目录，保存按版本命名的只读客户端快照、工具缓存和验证产物。导入时显式指定客户端来源。`var/scratch/` 用于当前 worktree 的临时调查。`resources/` 与 `var/` 下的本地数据由根目录 `.gitignore` 忽略。目录用途与产物查询见[客户端资源提取](tools/extraction/README.md#输入缓存与产物)。

## 文档

| 文档                                                               | 读者                 | 内容                                           |
| ------------------------------------------------------------------ | -------------------- | ---------------------------------------------- |
| [贡献指南](CONTRIBUTING.md)                                        | 贡献者               | 提交规范、PR 流程与合并限制                    |
| [Agent 协作约定](AGENTS.md)                                        | AI Agent、维护者     | 注释语言、lint、文档、领域术语、测试与 UI 约定 |
| [领域术语表](GLOSSARY.md)                                          | 各包开发者、AI Agent | 收录、图鉴、游戏关系、提取与资源发布的统一定义 |
| [CI/CD 与部署](DEPLOYMENT.md)                                      | 维护者               | 预览、正式发布、资源与 CORS 配置               |
| [网站应用](apps/website/README.md)                                 | 网站开发者           | 开发入口、代码结构、数据加载与常用检查         |
| [发布契约检查](apps/website/docs/release-checks.md)                | 网站开发者           | 职责边界、扩展指引与失败处理                   |
| [标签筛选策略](apps/website/docs/tag-filter-policy.md)             | 网站开发者           | 筛选语义、可见性边界与维护指引                 |
| [客户端资源提取](tools/extraction/README.md)                       | 提取工具使用者       | 首次配置、日常操作、排障与清理                 |
| [提取要求与规范](tools/extraction/docs/extraction-requirements.md) | 提取工具维护者       | 解释原则、收录准入、客户端用语与流水线要求     |
| [提取维护](tools/extraction/docs/extraction-maintenance.md)        | 提取工具维护者       | 待首次版本更新实操后补充                       |
| [业务确认与调查](tools/extraction/docs/business-investigation.md)  | 提取工具维护者       | 业务收录依据、确认结论与待调查事项             |
| [网站资源管理](tools/resources/README.md)                          | 资源维护者           | R2 凭证、校验、发布与清理                      |
| [共享数据契约](packages/schema/README.md)                          | 各包开发者           | 跨包约束、身份、图片与版本边界                 |
