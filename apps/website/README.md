# 网站应用

络米星集的网站应用，提供图鉴浏览、筛选、详情及友邻资料查询。使用 React、TanStack Start / Router、Tailwind CSS 与 shadcn/ui，通过 Vite+ 开发和构建，部署到 Cloudflare Workers。依赖版本以 [package.json](package.json) 和[工作区配置](../../pnpm-workspace.yaml)为准。

## 本地开发

先按[根 README](../../README.md#本地开发)安装依赖并准备本地或已发布资源。环境文件位置、读取顺序和资源地址覆盖方式统一见[环境配置](../../README.md#环境配置)。以下命令均在仓库根目录执行：

```bash
vp run website#dev
```

开发端口为 `3250`，实际访问地址以启动输出为准；根目录的 `vp run dev` 调用同一入口。

## 代码结构

```text
src/
  routes/           # 文件路由、页面入口与路由接线
  features/         # 按业务功能组织的页面、数据加载、查询与展示逻辑
  infrastructure/   # 资源读取、预览域名与响应等基础设施
  ui/               # 通用组件、Hooks 与 UI 工具
  assets/           # 随网站构建的图标与静态图片
  router.tsx        # 路由器配置
  server.ts         # 服务端入口
  site.ts           # 站点信息
  styles.css        # 全局样式入口
  routeTree.gen.ts  # 自动生成的路由树，不手工编辑
scripts/            # 本地资源服务、发布验证与预览管理
docs/               # 网站专属策略与发布契约检查说明
release.json        # 网站资源指针，指定生产构建默认使用的资源地址
```

业务改动从对应的 `features/` 目录入手，路由入口位于 `routes/`；跨页面的基础 UI 组件位于 `ui/`。React、组件引入与测试范围遵循仓库 [AGENTS.md](../../AGENTS.md)。

## 数据与资源

[资源读取器](src/infrastructure/resources.ts)先加载资源 manifest，再按其声明读取领域文档，核对字节数与 SHA256。功能模块将[共享数据契约](../../packages/schema/README.md)转换为页面查询与展示所需的数据，网站专属的可见性、分组和命名规则在应用内维护。

本目录的 [release.json](release.json) 是网站资源指针，仅指定 `resourceBaseUrl`；资源目录中的同名文件是描述发布内容的资源 manifest。更新游戏数据时，按[资源更新流程](../../docs/deployment.md#资源更新流程)完成提取、本地验证、上传与指针更新。

## 常用检查

| 命令                                         | 用途                                                 |
| -------------------------------------------- | ---------------------------------------------------- |
| `vp run website#test`                        | 网站的非 UI 测试                                     |
| `vp run website#build`                       | 构建网站                                             |
| `vp run --no-cache website#verify-contracts` | 校验本地资源是否满足网站的数据假设，需先 materialize |
| `vp run --no-cache website#verify-release`   | 校验选定的已发布资源及网站数据假设                   |
| `vp run website#verify-build`                | 校验已有构建产物的静态资源边界                       |
| `vp run ready`                               | 提交前执行全仓静态检查、测试与构建                   |

任务定义见 [package.json](package.json) 与 [vite.config.ts](vite.config.ts)。UI 改动通过静态检查、构建和人工验收确认；发布契约检查的扩展方式见下方文档。部署命令与凭证配置统一由部署说明维护。

## 相关文档

- [发布契约检查](docs/release-checks.md)：检查边界、注册方式和失败处理。
- [标签筛选策略](docs/tag-filter-policy.md)：全部页与食材筛选的可见性、分组和命名规则。
- [共享数据契约](../../packages/schema/README.md)：领域语义、图片引用与发布格式。
- [CI/CD 与部署](../../docs/deployment.md)：PR 预览、资源更新与正式发布。
- [贡献指南](../../CONTRIBUTING.md)：提交规范、PR 流程与合并限制。
