# 标签筛选策略

## 全部页

用[根标签配置](../src/features/catalog/tag-filter-policy.ts)调整「全部」页的筛选范围。标签 ID 可能随快照变化，因此配置使用客户端内部名称。入选分支只显示正式物品直接使用的标签及其祖先。

## 物品详情

物品详情的「筛选标签」将该物品可筛选的直接标签链接到「全部」页，「食材标签」链接到食材页。各入口沿用目标筛选器的名称。集合不继承成员标签。友邻详情保留完整偏好，只有在「全部」页可筛选的标签才提供链接。[物品概览标签](../src/features/omnidex/overview-tags.ts)

## 食材筛选

食材页与烹饪页「所需食材」共用[食材分组配置](../src/features/ingredients/tag-filter-policy.ts)。新增一级食材标签时，先确认归入现有分组、建立新维度，还是有明确理由排除，再更新配置和[归属检查](../scripts/release-checks/checks/tag-filter/ingredients.ts)。仅从用途展示中排除标签，仍须处理其筛选归属。

两页筛选均为同组取任一、跨组同时满足，父级匹配包含子级。当前结果为零的可见选项置灰，旧链接中已失效的标签应忽略。[筛选匹配](../src/features/ingredients/tag-filter.ts) · [查询状态](../src/features/ingredients/search.ts)

## 维护与检查

筛选树、已选标签和详情入口共用[显示名称解析](../src/features/omnidex/tags.ts)。不同分支的同名标签可用完整路径区分。同一父级出现重名时，须明确区分显示名称。

更新资源或策略后，按[发布契约检查](release-checks.md#运行方式)验证。人工打开受影响的列表和详情，核对筛选树、搜索、移除已选条件，以及详情链接打开的筛选结果。
