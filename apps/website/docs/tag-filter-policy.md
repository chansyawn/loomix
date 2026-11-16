# 标签筛选策略

「全部」页与食材筛选共用一套标签命名规则；两处的树结构和数据来源分别维护。

- 全部页策略：[`apps/website/src/features/all/tag-filter-policy.ts`](../src/features/all/tag-filter-policy.ts)
- 食材分组策略：[`apps/website/src/features/ingredients/tag-filter-policy.ts`](../src/features/ingredients/tag-filter-policy.ts)
- 共享名称特例与前缀：[`apps/website/src/features/collection/tags.ts`](../src/features/collection/tags.ts)

完整名单以这些配置为准，本文维护策略语义与配置变更的对应关系；检查机制见[发布契约检查](release-checks.md)。修改匹配、可见性或命名规则时同步本文档。

## 全部页

### 白名单

根标签白名单由全部页策略中的 `TAG_FILTER_ROOT_NAMES` 维护，使用 `internalName`，不使用可能随快照变化的标签 ID。

### 可见性

- 根标签必须在白名单中。
- 标签必须被至少一条正式物品的 `tagIds` 直接引用，或拥有可见子级。
- 引用标签的祖先路径保留；没有可见标签的白名单根整个隐藏。
- 集合记录（套装、系列）不参与可见性判断，与「全部」页的数据范围一致。
- 不加载 `neighbors.json`。只被友邻喜好引用的标签（例如“肥料”）不会出现在树中；友邻页对应链接进入「全部」页后会被静默忽略，不产生筛选或 chip。

## 食材筛选

食材浏览页和烹饪页的「所需食材」都使用三个独立筛选组：分类、颜色、食材品质。

| 分组     | 选项来源                   | URL 参数               |
| -------- | -------------------------- | ---------------------- |
| 分类     | 显式列出的品类根及其子树   | `ingredientCategories` |
| 颜色     | `食材_颜色` 的子级及其子树 | `ingredientColors`     |
| 食材品质 | `食材_品阶` 的子级及其子树 | `ingredientQualities`  |

- 数据源为 `gameplay-tags` 加 `catalog.items[].tagIds`（不含仅供引用的物品）。
- 分组内满足任一，不同分组同时满足；勾选父级不级联子级，但匹配包含全部子级。
- 标签按「至少一条正式食品引用」剪枝；0 引用的标签不可见，有了引用才出现。
- 计数按当前搜索结果或候选菜肴计算，0 计数置灰。
- URL 只接受正整数标签 ID；未知、结构根、未归属或不可见的 ID 在读取时丢弃。

### 一级标签维护

`食材` 的直接子级必须由 `INGREDIENT_TAG_GROUPS` 中的分组配置认领，否则校验失败。分类组使用 `rootNames`，颜色和品质组使用 `rootName`；完整归属以配置为准。

新增二级或更深标签时无需改配置，会按祖先自动归组。新增一级标签时，根据语义选择：

1. 归入分类：加入分类组的 `rootNames`；
2. 新增维度组：增加一条分组配置并同步 URL 参数与两页接线；
3. 暂不展示：从配置中排除，并同步调整 `tag-filter/ingredients` 的未归属断言；当前检查默认把未归属的一级标签报错。

## 中文名清理

筛选树和 chip 使用统一的名称解析顺序：

1. 若 `internalName` 命中 `TAG_LABEL_OVERRIDES`，直接返回特例名称；
2. 否则优先选用官方 `displayName`，缺失时回退到 `internalName`；
3. 从选定名称中去除匹配的 `TAG_LABEL_PREFIXES` 前缀。

例如 `产区分类` 可通过显式特例显示为“产区”；具体特例和前缀以共享名称配置为准。

- 允许不同分支存在同名标签，例如“食材”和“生物”下都可能有“草莓”；chip 使用完整路径区分。
- 同一父级下不允许重名，`tag-filter/all` 会报错。
- 名称清理作用于两处筛选树与 chip；详情页、类别页的既有展示保持不变。

## 维护与检查

每次更新 `resources/website/` 后必须执行发布契约检查，命令与失败处理见[发布契约检查](release-checks.md#运行方式)；本页只维护策略文件与检查报告的对应关系：

1. 根标签被重命名或新增品类：更新 `TAG_FILTER_ROOT_NAMES` 或食材分组配置。
2. 新增内部前缀：加入 `TAG_LABEL_PREFIXES`，确认不会造成同级重名。
3. 新增结构名或重名标签：加入 `TAG_LABEL_OVERRIDES`。
4. 若策略语义变化，更新本文档；仅增删配置项无需复制清单。

检查通过后运行 `vp run ready`，并人工打开「全部」页、食材浏览页和烹饪页，确认筛选树、搜索、AND/OR、chip 移除和友邻标签链接行为正常。
