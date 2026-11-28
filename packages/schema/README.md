# 共享数据契约

`@loomix/schema` 供提取器、资源发布器和网站直接导入 TypeScript 源码，无需单独构建。按领域选择入口，例如 `@loomix/schema/catalog`。完整导出见 [package.json](package.json) 的 `exports`，中英文概念见[领域术语表](../../GLOSSARY.md)。

## 修改领域数据

- 各消费者共用的结构和引用约束放在所属领域，跨领域关系在[资料集校验](src/dataset/index.ts)中检查。客户端准入依据、候选和解析诊断留在提取记录中。网站可见性、分组与命名由[发布契约检查](../../apps/website/docs/release-checks.md)验证。
- 从属资料内嵌在所属实体中，关系只保存一个方向。消费方按需反查，例如从植物查种子时沿种子的生长阶段查找。玩法标签同样只保存直接引用，祖先由[标签树](src/gameplay-tags/index.ts)推导。
- 按字段解释 `null`。制作配方的 `materials: null` 表示材料未知，已知时至少有一项。友邻房屋的 `upgrade: null` 表示该阶段未配置升级要求。[制作配方](src/catalog/recipes.ts) · [友邻房屋](src/neighbors/index.ts)

调整购买报价时，用[报价样例](examples/catalog-purchase-offers.jsonc)核对直接交付物、货币与价格条件。判断哪些报价或物品可以正式收录，查[业务确认与调查](../../tools/extraction/docs/business-investigation.md)。

## 资料集、图片与发布

游戏资料集沿用提取结果 ID，线上资源版本另有发布 ID。图片用身份与用途引用，消费方通过[图片索引](src/assets/index.ts)取得对应文件。

本地安装与线上发布共用[网站资源清单](src/website-resources/index.ts)，清单绑定资料文档和图片索引。[网站资源地址配置](../../apps/website/resource-address.json)选择生产构建要读取的版本。更改资源格式时，按[CI/CD 与部署](../../DEPLOYMENT.md#资源更新流程)一起切换契约、网站和资源地址。
