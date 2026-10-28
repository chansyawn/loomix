# loomix 络米小站

「星布谷地」非官方玩家社区，当前提供游戏资料整理与图鉴检索，未来计划扩展玩家分享和在售商品信息等社区功能。

网站域名：`loomix.fun`。

## 目录结构

```text
.
├── apps/
│   └── website/             # 玩家社区网站应用（页面、路由与样式）
├── packages/
│   └── schema/              # 领域模型、提取观察、资源与发布契约
├── tools/
│   ├── extraction/          # 客户端提取文档和脚本（按任务组织）
│   └── resource-publisher/  # 资源发布工具
├── resources/
│   ├── game-client/          # 当前客户端：config.ini、PetitPlanet_Data 等
│   ├── website/              # release.json、assets.json、语言目录与 assets/
├── .vscode/                  # VS Code 工作区配置
├── package.json              # 仓库级脚本和工具配置
├── pnpm-workspace.yaml       # pnpm workspace 与依赖版本配置
├── tsconfig.json             # TypeScript 根配置
└── vite.config.ts            # Vite+ 仓库级配置
```

`@loomix/schema` 按 catalog、neighbors、world、assets、dataset、release 和 common 划分子路径，维护发布契约。提取观察、原始数据库和证据模型位于 `tools/extraction`，仅复用发布契约中的通用结构。领域实体与图鉴收录分离；关系只保存一个方向，反向索引由消费方派生；图片引用使用 assetId 与 variant，交付路径由共享资源清单解析。提取器、发布器和网站共用严格契约，直接引用 TypeScript 源码，无需前置构建。

网站页面和路由主要位于 `apps/website/src/`。

## 本地资源处理

- `resources/game-client/`：保存完整客户端副本，作为资源读取来源。
- `var/`：提取运行时数据。`var/cache/anime-studio/` 为可重建工具缓存，`var/artifacts/{environments,extractions,deliveries}/` 为验收产物，`var/scratch/` 为失败运行、探针和一次性调查。
- `resources/website/`：验证通过的 release.json、assets.json、zh-CN/{catalog,neighbors,world}.json 和 assets/，供网站本地开发及资源发布直接读取。

`resources/` 与 `var/` 下的本地数据均由根目录 `.gitignore` 忽略。

维护中的提取实现和文档位于 [tools/extraction](tools/extraction/README.md)。准备本地输入后，按该文档依次运行 init、extract、deliver 和 verify。入口使用 `vp run '@loomix/extraction#<入口>'`；提取与交付需传入前一阶段打印的身份 ID。用 `vp run '@loomix/extraction#test'` 运行不依赖客户端的测试。

目录只保留当前客户端，游戏版本、配置与资源 revision 保留在脚本配置和产物元数据中。提取任务使用仓库 Node 环境，不需要 Python。

## 本地开发

在仓库根目录安装依赖并启动网站：

```bash
vp install
vp run dev
```
