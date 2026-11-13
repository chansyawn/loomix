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

维护中的提取实现和文档位于 [tools/extraction](tools/extraction/README.md)。首次使用时运行 `vp run '@loomix/extraction#client' -- import --source resources/game-client`，再运行 `vp run '@loomix/extraction#client' -- select --snapshot <snapshot-id>`。之后依次运行 init、extract、deliver 和 verify；提取与交付需传入前一阶段打印的身份 ID。用 `vp run '@loomix/extraction#test'` 运行不依赖客户端的测试。

运行 `vp run '@loomix/extraction#refresh'` 可从选定的只读客户端快照生成不可变交付。运行 `vp run '@loomix/extraction#materialize' --delivery <delivery-id>` 可将该交付发布到当前 worktree 的 `resources/website/`。普通 managed worktree 只安装依赖并携带网站资源，不自动运行提取。

客户端快照、AnimeStudio 缓存和版本化提取产物存放在 `LOOMIX_DATA_ROOT` 指定的本机共享目录。本机路径配置保存在未跟踪的 `.env`；新 worktree 通过 `.worktreeinclude` 取得此配置和网站资源。

每份客户端快照按完整文件清单 SHA256 版本化保存；environment 绑定使用的 snapshot ID。游戏版本、配置与资源 revision 保留在脚本配置和产物元数据中。提取任务使用仓库 Node 环境，不需要 Python。

## 本地开发

在仓库根目录安装依赖并启动网站：

```bash
vp install
vp run dev
```
