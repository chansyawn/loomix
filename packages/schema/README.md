# 共享数据契约

`@loomix/schema` 是提取器、资源发布器和网站共用的领域与发布契约，各包直接引用 TypeScript 源码，无需前置构建。领域定义以[领域术语表](../../GLOSSARY.md)为准；本文维护跨包约束与设计边界，具体字段、类型和校验约束以源码为准。

## 模块入口

| 模块                                                | 职责                                 |
| --------------------------------------------------- | ------------------------------------ |
| [catalog](src/catalog/index.ts)                     | 物品、集合、配方、生长配置与引用校验 |
| [gameplay-tags](src/gameplay-tags/index.ts)         | 标签树、子树查询与标签解析           |
| [neighbors](src/neighbors/index.ts)                 | 友邻及其内嵌资料                     |
| [starsea](src/starsea/index.ts)                     | 星海区域、星屿与探索关系             |
| [vignettes](src/vignettes/index.ts)                 | 小栖地模板、布景条件与关联资料       |
| [hair-dyeing](src/hair-dyeing/index.ts)             | 发型染色、色组解锁与花卉匹配         |
| [dataset](src/dataset/index.ts)                     | 游戏资料集与跨领域校验               |
| [assets](src/assets/index.ts)                       | 图片引用、网站图片文件与图片索引     |
| [website-resources](src/website-resources/index.ts) | 网站资源清单、文档组装与资源覆盖校验 |
| [release](src/release/index.ts)                     | 线上发布 ID 与存储标记               |
| [common](src/common/identity.ts)                    | 身份、来源、语言与格式版本           |

## 领域映射与约束

物品与集合共享 ID 空间，每个 ID 只出现一次。正式物品的准入依据保存在提取器中；客户端图鉴标记和网站页面可见性不进入共享收录类型。

从属数据内嵌在所属实体中，避免独立维护多份归属关系。关系只保存一个方向，反向索引由消费方派生，例如阶段 `plantId` 是植物关联的权威字段，植物到种子的关系由它派生。

每条购买报价属于一家商店，按直接交付物 ID 反查，保留一次购买的固定价或每日次数价。零金额需要明确配置。支付货币引用目录物品，名称、说明和图标均从该物品读取。友邻服饰的价格也从报价派生。

同店、同物、同币种出现异价时，已核实来自任务或限时货架的报价统一写 `"note": "任务/限时货架"`，其余报价省略 `note`。无短注的报价也可能随店铺状态变化。衣橱的补足方式写在店铺支付说明中。[带注释的完整目录样例](examples/catalog-purchase-offers.jsonc) · [业务确认与调查](../../tools/extraction/docs/business-investigation.md#物品价格与交易)

星海区域保留探索星屿顺序和区域邂逅关系。星屿展示物资引用物品目录，同名物品按 ID 区分。消费方可按物品或友邻 ID 反查区域和星屿。物资展示与邂逅候选的业务范围见[业务确认与调查](../../tools/extraction/docs/business-investigation.md#星海与星屿)。

物品 `tagIds` 保存直接标签并稳定去重，`gameplay-tags` 保存完整标签树的内部名、父级和显示文本。颜色、材质、风格、产区和食材分类由对应子树派生，送礼偏好与食谱引用统一标签。客户端获取提示由提取器保存在调查记录中，玩法关系由对应领域的数据提供。

`category` 与 `furnitureCategory` 分别保存展示分类与家具分类。家具尺寸、生物体型范围和菜肴力气以数值保存，展示文案由网站拼接；页面 DTO 与展示层命名不进入共享契约。

未知值在可空字段中显式表示为 `null`，与已确认的空数组不同。例如制作配方的 `materials: null` 表示材料未知，不表示免费制作。结构严格拒绝附加字段，恒为未知的候选字段不进入发布契约。

染发区域名称使用游戏文案。发布色组带有解锁配置，区域只引用可选色组。默认色块由区域单独引用，也可来自可选组之外。收录依据见[业务确认与调查](../../tools/extraction/docs/business-investigation.md#外观与染发)。

## 资料集、图片与发布

游戏资料集的 `context.datasetId` 取生成它的提取结果 ID。`source` 保存客户端版本与资源来源版本，`context` 保存资料集身份、语言和格式版本。语言不改变实体字段名。

资料按图片身份与用途引用资源。`image-index.json` 为每组身份及用途登记转换后的文件与完整性信息。结构以 `assets` 模块为准。

| 文件                                                              | 概念与结构                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `resources/website/resource-manifest.json`                        | 网站资源清单，在打包时生成，绑定来源上下文、资料文档与图片索引  |
| [resource-address.json](../../apps/website/resource-address.json) | 网站资源地址配置，保存 `resourceBaseUrl` 供生产构建选择资源版本 |

本地和线上共用 `website-resources` 模块的组装入口与验证规则。线上发布 ID 由发布工具生成，格式版本表达数据契约。命名与恢复规则见[网站资源管理](../../tools/resources/README.md)。

提取器、发布器和网站均使用 `ContextSchema` 定义的当前格式。升级时先发布新格式资源，再随网站代码更新资源地址配置。[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)

## 与其他层的边界

共享契约包含消费方需要的结构化资料。客户端原始字段、准入依据、图鉴标记、未确认候选与解析诊断保存在客户端读取记录和字段依据中。[提取要求与规范](../../tools/extraction/docs/extraction-requirements.md)

本包负责消费者中立的结构、引用和资源覆盖规则；网站可见性、分组与命名等假设由[发布契约检查](../../apps/website/docs/release-checks.md)负责。资源目录、文件字节与上传完整性由[网站资源管理](../../tools/resources/README.md)负责。
