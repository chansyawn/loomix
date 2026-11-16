# 发布契约检查

发布契约检查验证**网站对发布数据的假设**是否仍然成立。它不是提取器的数据保真校验，也不替代资源发布工具的目录校验。

## 边界

| 规则类型                                               | 归属                                               |
| ------------------------------------------------------ | -------------------------------------------------- |
| 客户端事实、身份、跨表关联、版本绑定规范化、证据       | extraction                                         |
| 消费者中立的通用解释（标签子树、类型、资源解析）       | [共享数据契约](../../../packages/schema/README.md) |
| 网站对发布数据的假设（可见性、分组、命名、结构完整性） | `apps/website/scripts/release-checks/`             |
| 筛选、URL 状态等不依赖渲染的逻辑                       | 非 UI 单元测试                                     |
| 页面交互与渲染                                         | 人工验收，不编写 UI 自动化测试                     |

判断标准：换一个消费者仍然成立的规则放 schema 或 extraction；只服务当前页面策略的规则放这里。

## 运行方式

本地（`materialize` 之后）：

```bash
vp run --no-cache website#verify-contracts
```

部署链路：

```bash
vp run --no-cache website#verify-release
```

`verify-release` 下载网站资源指针 `apps/website/release.json` 指向的已发布 release，运行同一套检查；现有 CI 的 `Verify website` 步骤已经包含它，不需要新增 workflow。资源上传仍由发布工具的 `validateContent` 负责，发布契约检查阻断的是网站部署，不是 R2 上传。

`verify-release` 要求网站资源指针指向的 release 与当前 `@loomix/schema` 的 `formatVersion` 匹配；资源格式升级后需要先发布新 release 并更新网站资源指针。

## 检查接口

接口以 [types.ts](../scripts/release-checks/types.ts) 为准：`ReleaseCheck` 提供唯一 `id` 和 `run(release)`；结果包含问题列表 `issues` 与可选摘要 `summary`，每个问题含 `message` 与可选数据路径 `path`。

约束：

- 检查是纯函数，只读取 `Release`，不做文件或网络 I/O。
- 一个检查对应一类网站假设；不要把所有断言塞进同一个检查。
- 预期失败返回 `issues`，不要抛异常；抛出的异常会被 runner 捕获，计为一条“检查执行失败”的问题并保留堆栈。
- `summary` 只在检查通过时输出；`path` 是可读的数据定位符。
- 检查 ID 必须唯一；runner 在运行前校验。

## 新增检查

1. 在 `apps/website/scripts/release-checks/checks/<area>/` 新增文件，导出纯检查函数和 `ReleaseCheck` 适配器。
2. 在 `apps/website/scripts/release-checks/index.ts` 的 `releaseChecks` 中显式注册。
3. 新增 fixture 测试；fixture 从生产策略常量生成，避免手写策略清单。
4. 运行 `vp run --no-cache website#verify-contracts`，确认基线与失败信息。

## 当前检查

| ID                       | 内容                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `tag-filter/all`         | 配置的白名单根存在且有可见标签；整棵可见树的标签命名不含 `_`/“父级”；同级重名                                          |
| `tag-filter/ingredients` | `食材` 根存在；分组根是 `食材` 的直接子级；颜色/品质组有子级和可见选项；排除标签在 `食材` 子树内；一级标签全部归属分组 |
| `tag-filter/labels`      | `TAG_LABEL_OVERRIDES` 的目标 `internalName` 存在                                                                       |

`tag-filter/all` 覆盖整棵可见树，包含 `食材` 子树，因此可见标签命名和同级重名由它统一检查；`tag-filter/ingredients` 只负责食材分组结构和分组可见性。

## 失败处理

runner 按检查顺序输出 `✓`/`✗`，失败时以非零退出码结束并汇总问题数量。按报告修正策略文件、分组配置或数据后，重新运行 `vp run --no-cache website#verify-contracts`；通过后运行 `vp run ready` 确认没有其他回归。

发布契约检查只覆盖文档级数据。`Release` 包含图片元数据，但本地加载器不解码图片，`downloadRelease` 也不下载图片字节；需要字节级图片检查时，应在 runner 中增加资源读取上下文，而不是只新增一个检查文件。
