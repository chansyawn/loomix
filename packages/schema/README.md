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

从属数据内嵌在所属实体中，关系只保存一个方向。例如种子的生长阶段通过 `plantId` 引用植物，消费方据此反查植物对应的种子。

作物株和花株以自身 ID 收录，`harvestItemId` 引用其收获物。若生长阶段的 `id` 对应植株，该阶段的 `plantId` 必须与植株的 `harvestItemId` 相同。小栖地布景按植株自身的物品 ID 或玩法标签匹配。

每条购买报价表示一家商店一次购买的花费，按直接交付物 ID 反查，支付货币引用目录物品。零金额须有明确配置，友邻服饰的价格也从报价派生。同店同币种的异价可附短注说明已核实的货架来源，缺少短注不能推断商品常驻。[购买报价样例](examples/catalog-purchase-offers.jsonc) · [业务确认与调查](../../tools/extraction/docs/business-investigation.md#购买报价)

星海区域保留探索星屿的顺序与邂逅关系。星屿展示的物资按物品 ID 引用，展示范围和实际产出的区别见[业务确认与调查](../../tools/extraction/docs/business-investigation.md#星海与星屿)。

物品只记录直接标签。消费方沿玩法标签树推导分类，送礼偏好与食谱也引用这棵树。尺寸、体型等数值保留原有含义，展示文案由消费方生成。

可空字段用 `null` 表示未知，空数组表示已确认没有条目。例如制作配方的 `materials: null` 表示材料未知，不能据此推断免费制作。恒为未知的候选字段留在提取记录中。

友邻房屋的升级要求归属于目标阶段。`upgrade.materials` 是投入共建箱的建材，`upgrade.blueprint` 是领取订单所用的图纸，两者都引用目录物品并保留数量。`upgrade: null` 专指客户端在该阶段未配置这两组要求。

染发区域单独引用默认色块，默认色块可以来自可选色组之外。色组的收录依据见[业务确认与调查](../../tools/extraction/docs/business-investigation.md#外观与染发)。

## 资料集、图片与发布

游戏资料集沿用提取结果 ID，格式版本标识共享数据契约。切换语言时实体字段名保持一致。

资料按图片身份与用途引用资源。`image-index.json` 为每组身份及用途登记转换后的文件与完整性信息。结构以 `assets` 模块为准。

| 文件                                                              | 概念与结构                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `resources/website/resource-manifest.json`                        | 网站资源清单，在打包时生成，绑定来源上下文、资料文档与图片索引  |
| [resource-address.json](../../apps/website/resource-address.json) | 网站资源地址配置，保存 `resourceBaseUrl` 供生产构建选择资源版本 |

本地与线上使用同一套组装和验证规则。发布工具为每个线上版本分配独立的发布 ID。提取器、发布器和网站均校验契约指定的格式版本，升级和回滚流程见[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)。

## 与其他层的边界

共享契约包含消费方需要的结构化资料。客户端原始字段、准入依据、图鉴标记、未确认候选与解析诊断保存在客户端读取记录和字段依据中。[提取要求与规范](../../tools/extraction/docs/extraction-requirements.md)

本包负责消费者中立的结构、引用和资源覆盖规则；网站可见性、分组与命名等假设由[发布契约检查](../../apps/website/docs/release-checks.md)负责。资源目录、文件字节与上传完整性由[网站资源管理](../../tools/resources/README.md)负责。
