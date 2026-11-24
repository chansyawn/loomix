# 网站应用

络米星集的网站应用，提供图鉴浏览、筛选、详情及友邻资料查询。使用 React、TanStack Start / Router、Tailwind CSS 与 shadcn/ui，通过 Vite+ 开发和构建，部署到 Cloudflare Workers。依赖版本以 [package.json](package.json) 和[工作区配置](../../pnpm-workspace.yaml)为准。

## 本地开发

依赖安装与资源准备见[根 README](../../README.md#本地开发)，环境文件规则也由根 README 维护。命令在仓库根目录执行：

```bash
vp run website#dev
```

实际访问地址以启动输出为准；根目录的 `vp run dev` 调用同一入口。

## 名称搜索

在当前列表中输入条目名称的片段、拼音或首字母，例如用 `fanqie` 或 `fq` 查找「番茄」。首页提交后进入「全部」页（`/catalog`）；单条详情在 `/catalog/$id`，分类列表可直接通过根路径访问。星海按星屿名查询，可与区域筛选叠加，复制列表地址即可分享关键词、区域和布局。筛选面板内的小搜索框查找选项名称，勾选选项后应用筛选。

## 图鉴详情

宽屏在物品图片下方纵向排列目录和关联物品，左栏导航保持可见，仅在内容超出可用高度时滚动。右栏的概览和后续章节共用同一阅读宽度。窄屏的目录和关联物品入口并排吸顶，点击后展开对应列表。目录高亮随阅读位置更新，选中章节后可复制地址分享该章节。

## 代码结构

业务改动从 [features](src/features/) 入手，[routes](src/routes/) 负责路由接线；资源读取等基础设施在 [infrastructure](src/infrastructure/)，通用组件在 [ui](src/ui/)，资源验证与预览工具在 [scripts](scripts/)。自动生成的路由树不手工编辑。

React、组件引入与测试范围遵循[Agent 协作约定](../../AGENTS.md)。

## 数据与资源

[资源读取器](src/infrastructure/resources.ts)先加载资源发布清单，再按其声明读取领域文档，核对字节数与 SHA256。功能模块将[共享数据契约](../../packages/schema/README.md)转换为页面查询与展示所需的数据，网站专属规则在应用内维护，标签的可见性、分组和命名依据见[标签筛选策略](docs/tag-filter-policy.md)；领域定义遵循[领域术语表](../../GLOSSARY.md)。

网站用 `Omnidex` 指图鉴功能，`Catalog` 指物品目录，`Collection` 指单个集合。通用物品关联视图的 `browsable` 标记控制该视图的浏览与链接，不能用来判断正式收录资格。友邻服饰已正式收录并有独立详情，但不进入该通用关联视图的可浏览范围。图鉴列表位于「服饰 → 友邻服饰」。

家具详情的制作配方直接展示创想卡面与所需材料。树木详情的砍树掉落共用创想卡面，点击掉落里的创想卡可进入对应家具详情。在图鉴单品详情的「用途」里选择有结果的分类，点击命中条件可定位到对应制作配方，或展开对应的食材槽位或布景要求。小栖地用途随模板读取完成后补入。布景的摆放规则和参考物品单独展示，反查命中来自摆放物和承载物条件。参考物品清单和现有插图提供摆放参考，空间视图需有可确认的坐标、朝向与承载数据才能接入。

本地与线上网站资源共用 `resource-manifest.json`。生产构建默认使用 `resource-address.json` 的资源地址。更新游戏数据时按部署文档完成打包、安装、发布与地址更新。[共享数据契约](../../packages/schema/README.md#资料集图片与发布) · [CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)

## 常用检查

| 命令                                         | 用途                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `vp run website#test`                        | 网站的非 UI 测试                                                                     |
| `vp run website#build`                       | 构建网站                                                                             |
| `vp run --no-cache website#verify-contracts` | 校验已安装的本地资源是否满足网站的数据假设                                           |
| `vp run --no-cache website#verify-release`   | 校验选定的已发布资源及网站数据假设                                                   |
| `vp run website#verify-build`                | 校验已有构建产物的静态资源边界                                                       |
| `vp run website#verify`                      | 执行完整发布前验证，需访问已发布资源；见[CI/CD 与部署](../../DEPLOYMENT.md#正式发布) |
| `vp run ready`                               | 提交前执行全仓静态检查、测试与构建                                                   |

任务定义见 [package.json](package.json) 与 [vite.config.ts](vite.config.ts)。UI 改动通过静态检查、构建和人工验收确认；数据检查的扩展方式与失败处理见[发布契约检查](docs/release-checks.md)。部署命令与凭证配置统一由[CI/CD 与部署](../../DEPLOYMENT.md)维护。
