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
│   ├── anime-studio/             # 本地 AnimeStudio 工具
│   ├── petit-planet-game/        # 按客户端版本保存游戏副本
│   │   └── <version>/           # config.ini、可执行文件与 PetitPlanet_Data
│   ├── petit-planet-extraction/  # 按版本保存共用索引和任务产物
│   │   └── <version>/
│   │       ├── index/           # Asset Map 等共用索引
│   │       ├── items/           # 全物品提取产物、日志和验证结果
│   │       └── content/         # 根字段 93 的有效内容 JSON 和素材
│   └── temp/                   # 临时文件
├── .vscode/                  # VS Code 工作区配置
├── package.json              # 仓库级脚本和工具配置
├── pnpm-workspace.yaml       # pnpm workspace 与依赖版本配置
├── tsconfig.json             # TypeScript 根配置
└── vite.config.ts            # Vite+ 仓库级配置
```

`@loomix/content-schema` 提供当前 content JSON 的严格 schema、推导类型及成员引用校验。`@loomix/extraction` 和 website 通过 workspace 依赖共享契约，直接引用 TypeScript 源码，无需前置构建；数据格式与提取产物保持不变。

网站页面和路由主要位于 `apps/website/src/`。

## 本地资源处理

- `resources/anime-studio/`：AnimeStudio 本地工具，用于浏览、预览和导出 Unity 游戏资源；上游项目：[Escartem/AnimeStudio](https://github.com/Escartem/AnimeStudio)。
- `resources/petit-planet-game/<version>/`：保存完整客户端副本，作为资源读取来源。
- `resources/petit-planet-extraction/<version>/index/`：保存对应客户端的 Asset Map 等共用索引，供各提取任务读取。
- `resources/petit-planet-extraction/<version>/<任务>/`：保存该版本的任务产物；`items` 为全物品调查库，`content` 为根字段 93 收录的有效内容 JSON 和素材。content 的日志、来源证据和缺失报告存入临时目录。
- `resources/temp/`：用于存储临时文件。

`resources/` 下的本地资源文件由根目录 `.gitignore` 忽略，`resources/temp/` 整体忽略。

维护中的提取脚本与文档位于 [tools/extraction](tools/extraction/README.md)，各任务分别提供不依赖脚本的原理指南和对应当前实现的执行手册。安装仓库依赖并准备本地输入后，使用 `vp run --no-cache '@loomix/extraction#items'` 提取全物品，使用 `vp run --no-cache '@loomix/extraction#content'` 提取有效内容，使用 `vp run '@loomix/extraction#test'` 运行不依赖客户端的测试。

目录中的 `<version>` 为客户端版本号，配置与资源 revision 保留在脚本配置和产物元数据中。提取任务使用仓库 Node 环境，不需要 Python。

## 本地开发

在仓库根目录安装依赖并启动网站：

```bash
vp install
vp run dev
```
