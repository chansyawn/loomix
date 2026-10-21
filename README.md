# loomix 络米小站

「星布谷地」非官方玩家社区，当前提供游戏资料整理与图鉴检索，未来计划扩展玩家分享和在售商品信息等社区功能。

网站域名：`loomix.fun`。

## 目录结构

```text
.
├── apps/
│   └── website/             # 玩家社区网站应用（页面、路由与样式）
├── packages/
│   └── content-schema/      # extraction 与网站共用的内容契约
├── tools/
│   ├── extraction/          # 客户端提取文档和脚本（按任务组织）
│   └── resource-publisher/  # 资源发布工具
├── resources/
│   ├── extraction-tools/     # 自动准备的提取工具、SDK 和运行时缓存
│   ├── game-client/    # 当前客户端：config.ini、PetitPlanet_Data 等
│   ├── website/              # 网站数据 content.json 和 assets/
│   └── temp/extraction/      # 共用索引、中间文件、日志与迁移旧产物
├── .vscode/                  # VS Code 工作区配置
├── package.json              # 仓库级脚本和工具配置
├── pnpm-workspace.yaml       # pnpm workspace 与依赖版本配置
├── tsconfig.json             # TypeScript 根配置
└── vite.config.ts            # Vite+ 仓库级配置
```

`@loomix/content-schema` 提供当前 content JSON 的严格 schema、推导类型及成员引用校验。`@loomix/extraction` 和 website 通过 workspace 依赖共享契约，直接引用 TypeScript 源码，无需前置构建；数据格式与提取产物保持不变。

网站页面和路由主要位于 `apps/website/src/`。

## 本地资源处理

- `resources/extraction-tools/`：统一提取模块自动下载或构建的工具、SDK 和运行时缓存；可删除后重新初始化。AnimeStudio 上游项目：[Escartem/AnimeStudio](https://github.com/Escartem/AnimeStudio)。
- `resources/game-client/`：保存完整客户端副本，作为资源读取来源。
- `resources/temp/extraction/index/`：保存当前客户端的 Asset Map 等共用索引，供各提取任务读取。
- `resources/website/`：验证通过的 content.json 和 assets/，供网站本地开发直接读取。
- `resources/temp/`：用于存储临时文件。

`resources/` 下的本地资源文件由根目录 `.gitignore` 忽略，`resources/temp/` 整体忽略。

维护中的提取脚本与文档位于 [tools/extraction](tools/extraction/README.md)，各任务分别提供不依赖脚本的原理指南和对应当前实现的执行手册。安装仓库依赖并准备本地输入后，使用 `vp run --no-cache '@loomix/extraction#content'` 提取有效内容，使用 `vp run '@loomix/extraction#test'` 运行不依赖客户端的测试。

目录只保留当前客户端，游戏版本、配置与资源 revision 保留在脚本配置和产物元数据中。提取任务使用仓库 Node 环境，不需要 Python。

## 本地开发

在仓库根目录安装依赖并启动网站：

```bash
vp install
vp run dev
```
