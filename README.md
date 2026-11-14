# 络米星集 loomix.fun

络米星集是非官方的星布谷地游戏工具与资料站，提供家具、服饰、生物、植物、烹饪和友邻等图鉴与资料查询。

网站域名：`loomix.fun`。

协作与发布：[贡献指南](CONTRIBUTE.md) · [CI/CD 与部署](docs/deployment.md)。

## 目录结构

```text
.
├── apps/
│   └── website/             # 网站应用（页面、路由与样式）
├── packages/
│   └── schema/              # 领域模型、提取观察、资源与发布契约
├── tools/
│   ├── extraction/          # 客户端提取文档和脚本（按任务组织）
│   └── resource-publisher/  # 资源发布工具
├── resources/
│   └── website/              # 当前 worktree 的本地资源副本
├── .vscode/                  # VS Code 工作区配置
├── package.json              # 仓库级脚本和工具配置
├── pnpm-workspace.yaml       # pnpm workspace 与依赖版本配置
├── tsconfig.json             # TypeScript 根配置
└── vite.config.ts            # Vite+ 仓库级配置
```

`@loomix/schema` 按 catalog、neighbors、world、assets、dataset、release 和 common 划分子路径，维护发布契约。提取观察、原始数据库和证据模型位于 `tools/extraction`，仅复用发布契约中的通用结构。领域实体与图鉴收录分离；关系只保存一个方向，反向索引由消费方派生；图片引用使用 assetId 与 variant，交付路径由共享资源清单解析。提取器、发布器和网站共用严格契约，直接引用 TypeScript 源码，无需前置构建。

网站页面和路由主要位于 `apps/website/src/`。

## 本地资源处理

- `resources/game-client/`：首次导入共享只读快照时可用作本地来源。
- `LOOMIX_DATA_ROOT/`：本机共享数据目录，保存客户端快照、AnimeStudio 缓存和验证产物；通过未跟踪的 `.env` 配置，变量模板见 `.env.example`。
- `var/scratch/`：当前 worktree 的临时调查与运行数据。
- `resources/website/`：验证通过的 release.json、assets.json、zh-CN/{catalog,neighbors,world}.json 和 assets/，供网站本地开发及资源发布直接读取。

`resources/` 与 `var/` 下的本地数据均由根目录 `.gitignore` 忽略。

首次配置和提取命令见[客户端资源提取说明](tools/extraction/README.md)。`refresh` 从选定快照生成共享交付，`materialize` 将指定交付发布到当前 worktree 的 `resources/website/`。

Codex managed worktree 通过 `.worktreeinclude` 携带 `.env` 和网站资源，setup 只安装依赖；客户端、工具缓存和提取产物由同机 worktree 共享。

## 本地开发

本地配置统一放在仓库根目录 `.env`，模板为 `.env.example`。已有进程环境变量优先。网站额外支持根目录的 `.env.local`、`.env.[mode]` 和 `.env.[mode].local`，模式文件优先于通用文件；Wrangler 部署读取根 `.env` 和可选的 `.env.local`；提取器与资源发布器只读取 `.env`。子目录环境文件不再加载。

`VITE_RESOURCE_BASE_URL` 默认无需配置：开发和测试使用 `resources/website/`，生产读取 `apps/website/release.json`。只有 `VITE_` 前缀变量可暴露给客户端，请勿为凭证使用该前缀。managed worktree 仅携带根 `.env`，不会自动携带模式文件。

在仓库根目录安装依赖并启动网站：

```bash
vp install
vp run dev
```
