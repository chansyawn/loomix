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
│   ├── game-client/          # 当前客户端：config.ini、PetitPlanet_Data 等
│   ├── website/              # 网站数据 content.json 和 assets/
│   └── temp/extraction/      # 版本化环境、工具缓存、提取与交付 bundle
├── .vscode/                  # VS Code 工作区配置
├── package.json              # 仓库级脚本和工具配置
├── pnpm-workspace.yaml       # pnpm workspace 与依赖版本配置
├── tsconfig.json             # TypeScript 根配置
└── vite.config.ts            # Vite+ 仓库级配置
```

`@loomix/content-schema` 提供当前 content JSON 的严格 schema、推导类型及成员引用校验。`@loomix/extraction` 和 website 通过 workspace 依赖共享契约，直接引用 TypeScript 源码，无需前置构建；数据格式与提取产物保持不变。

网站页面和路由主要位于 `apps/website/src/`。

## 本地资源处理

- `resources/game-client/`：保存完整客户端副本，作为资源读取来源。
- `resources/temp/extraction/`：工具缓存位于 `tool-cache/`，环境、提取与交付证据分别位于 `environments/`、`runs/` 和 `deliveries/`。
- `resources/website/`：验证通过的 content.json 和 assets/，供网站本地开发直接读取。
- `resources/temp/`：用于存储临时文件。

`resources/` 下的本地资源文件由根目录 `.gitignore` 忽略，`resources/temp/` 整体忽略。

维护中的提取实现和文档位于 [tools/extraction](tools/extraction/README.md)。准备本地输入后，按该文档依次运行 init、extract、postprocess 和 verify。入口使用 `vp run --no-cache '@loomix/extraction#<入口>'`；提取与后处理需传入前一阶段打印的身份 ID。用 `vp run --no-cache '@loomix/extraction#test'` 运行不依赖客户端的测试。

目录只保留当前客户端，游戏版本、配置与资源 revision 保留在脚本配置和产物元数据中。提取任务使用仓库 Node 环境，不需要 Python。

## 本地开发

在仓库根目录安装依赖并启动网站：

```bash
vp install
vp run dev
```
