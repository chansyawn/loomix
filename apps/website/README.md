# 网站应用

> **维护范围** 开发入口、页面接入方式或数据解释规则变化时，更新本文。仅调整布局、按钮位置或图片展示顺序时，无需更新。

## 本地开发

按[根 README](../../README.md#本地开发)安装依赖、准备资源并启动网站。日常在仓库根目录运行 `vp run website#test` 执行非 UI 测试，加 `watch` 可持续监听。用 `vp run website#build` 构建网站，页面交互通过人工验收。

## 使用网站

列表支持名称片段、拼音与首字母搜索，例如 `fanqie` 或 `fq` 都能查找「番茄」。复制列表地址可分享筛选和视图。在侧栏底部选择「安装应用」可将网站安装为网页应用，安装后查询资料仍需联网。

## 接入列表或详情页

- 在 [features](src/features/) 下按领域组织查询和展示，由 [routes](src/routes/) 接入路由。路由树自动生成。
- 新列表向[共享列表](src/features/list-page/)提供查询结果、筛选控件、表格列和卡片内容。
- 详情页使用[共享详情组件](src/features/detail-page/)。便于扫读的属性放在概览，需要比较候选、核对用量或按顺序阅读的内容放入独立章节。可参考[菜肴详情](src/features/dishes/detail-presentation.tsx)。

## 数据与资源

[资源读取器](src/infrastructure/resources.ts)按资源清单校验并加载领域文档。解释物品和集合的身份时查[领域术语表](../../GLOSSARY.md#收录与图鉴)。例如，关联视图中的 `browsable` 只控制该处的链接，用它判断正式收录会漏掉有独立详情的友邻服饰。

涉及购买报价、星屿探索或小栖地条件时，以[业务确认与调查](../../tools/extraction/docs/business-investigation.md)中的证据区分客户端配置和游戏实际行为。调整跨页面筛选入口时，查[标签筛选策略](docs/tag-filter-policy.md)。

数据或图片加载失败时，先按[根 README](../../README.md#环境配置)确认资源地址，再按[发布契约检查](docs/release-checks.md#运行方式)验证对应版本。
