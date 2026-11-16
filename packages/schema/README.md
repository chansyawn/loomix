# 共享数据契约

`@loomix/schema` 是提取器、资源发布器和网站共用的领域与发布契约，各包直接引用 TypeScript 源码，无需前置构建。具体字段、类型和校验约束以源码为准；本文说明跨包共享的语义。

## 模块入口

| 模块                                        | 职责                                 |
| ------------------------------------------- | ------------------------------------ |
| [catalog](src/catalog/index.ts)             | 物品、集合、配方、生长配置与引用校验 |
| [gameplay-tags](src/gameplay-tags/index.ts) | 标签树、子树查询与标签解析           |
| [neighbors](src/neighbors/index.ts)         | 友邻及其内嵌资料                     |
| [dataset](src/dataset/index.ts)             | 统一领域快照与跨领域校验             |
| [assets](src/assets/index.ts)               | 图片引用与交付文件映射               |
| [release](src/release/index.ts)             | 发布清单、文档组装与资源覆盖校验     |
| [common](src/common/identity.ts)            | 身份、来源、语言与格式版本           |

## 领域语义

`catalog.items` 通过 `kind` 区分正式物品与 `reference`；后者用于解析配方、掉落或偏好引用的范围外物品，只保存名称与说明，不进入正式列表或详情。`catalog.collections` 保存套组和系列，以 `memberKind` 约束成员类型。每个 ID 在物品与集合之间只出现一次。

一对一的从属数据内嵌在所属实体中：种子内嵌 `growth`，菜肴内嵌烹饪配方，家具内嵌制作配方；星球、故事、能力、住宅、送礼偏好与补充图片内嵌在友邻中。关系只保存一个方向，反向索引由消费方派生，例如阶段 `plantId` 是植物关联的权威字段，植物到种子的关系由它派生。

物品 `tagIds` 保存直接标签并稳定去重，不展开祖先；`gameplay-tags` 保存完整标签树的内部名、父级和显示文本。颜色、材质、风格、产区和食材分类由对应子树派生，送礼偏好与食谱引用统一标签。来源等多值字段使用数组，不从展示字符串反向拆解。

`category` 与 `furnitureCategory` 分别保存展示分类与家具分类。家具尺寸、生物体型范围和菜肴力气以数值交付，展示文案由网站拼接；页面 DTO 与展示层命名不进入共享契约。

未知值在可空字段中显式表示为 `null`，与已确认的空数组不同。例如制作配方的 `materials: null` 表示材料未知，不表示免费制作。结构严格拒绝附加字段，恒为未知的候选字段不进入发布契约。

## 快照、图片与发布

`dataset` 汇集领域数据及快照上下文；`assets` 将领域图片引用 `{assetId, variant}` 映射为不可变文件路径、SHA256、字节数与尺寸。领域实体不保存交付路径；同一源图的 icon、banner、illustration 分别登记。

资源 manifest `resources/website/release.json` 描述一份完整发布，列出语言目录中的 gameplay-tags、catalog、neighbors 文档与共享 assets 文档，以每份文档的实际 SHA256 和字节数绑定发布内容。formatVersion、snapshotId、locale 和来源版本在 manifest 中声明，加载时组装为带上下文的 dataset。语言属于快照上下文，不改变实体字段名。

网站资源指针 [apps/website/release.json](../../apps/website/release.json) 仅保存 `resourceBaseUrl`，供生产构建定位已发布资源；它不是资源 manifest，不能相互替换。

当前允许的 `formatVersion` 由 [ContextSchema](src/common/identity.ts) 定义，不保留历史版本解析分支。格式升级时，提取器、发布器和网站需使用匹配契约；先发布兼容的新资源，再更新网站资源指针，具体步骤见[资源更新流程](../../docs/deployment.md#资源更新流程)。

## 与其他层的边界

发布契约只包含消费方需要的结构化数据；客户端原始字段、准入依据、图鉴标记、未确认候选与解析诊断保存在提取器的观察和证据中，内部 checkpoint 不属于公开交付格式。字段来源、图片转换与保真验收见[提取原理](../../tools/extraction/extraction-method.md)。

本包负责消费者中立的结构、引用和资源覆盖规则；网站可见性、分组与命名等假设由[发布契约检查](../../apps/website/docs/release-checks.md)负责。资源目录、文件字节与上传完整性由[资源发布器](../../tools/resource-publisher/README.md)负责。
