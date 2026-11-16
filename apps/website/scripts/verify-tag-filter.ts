import { readFileSync } from "node:fs";
import path from "node:path";
import { isListedItem, parseCatalog } from "@loomix/schema/catalog";
import { createGameplayTagIndex, parseGameplayTags } from "@loomix/schema/gameplay-tags";
import {
  ALL_TAG_FILTER_POLICY,
  TAG_FILTER_ROOT_NAMES,
} from "../src/features/all/tag-filter-policy.ts";
import {
  flattenFilterOptions,
  type FilterOption,
} from "../src/features/collection/filter-types.ts";
import { createCollectionTagFilter, TAG_LABEL_OVERRIDES } from "../src/features/collection/tags.ts";
import {
  INGREDIENT_TAG_GROUPS,
  INGREDIENT_USAGE_EXCLUDED,
} from "../src/features/ingredients/tag-filter-policy.ts";
import { createIngredientTagSource } from "../src/features/ingredients/tag-source.ts";
import { resolveResourceConfig } from "./resource-config.ts";

const config = resolveResourceConfig("development");
if (config.source !== "local") {
  throw new Error("标签策略检查需要本地资源，请先 materialize 到 resources/website。");
}

const directory = path.join(config.directory, "zh-CN");
const tagDocument = parseGameplayTags(
  JSON.parse(readFileSync(path.join(directory, "gameplay-tags.json"), "utf8")),
);
const catalog = parseCatalog(
  JSON.parse(readFileSync(path.join(directory, "catalog.json"), "utf8")),
);
const records = catalog.items.filter(isListedItem);
const tagIndex = createGameplayTagIndex(tagDocument.tags);
const filter = createCollectionTagFilter(
  tagDocument.tags,
  tagIndex,
  records,
  ALL_TAG_FILTER_POLICY,
);
const options = filter.options();
const flattened = flattenFilterOptions(options);
const issues: string[] = [];

for (const name of TAG_FILTER_ROOT_NAMES) {
  if (!tagDocument.tags.some((tag) => tag.parentId === null && tag.internalName === name))
    issues.push(`白名单根不存在：${name}`);
  if (!options.some((option) => option.label === (TAG_LABEL_OVERRIDES[name] ?? name)))
    issues.push(`白名单根当前没有可见标签：${name}`);
}
for (const name of Object.keys(TAG_LABEL_OVERRIDES)) {
  if (!tagDocument.tags.some((tag) => tag.internalName === name))
    issues.push(`命名特例指向不存在的标签：${name}`);
}
for (const option of flattened) {
  if (/[_]|父级/.test(option.label)) issues.push(`可见标签仍含内部命名：${option.label}`);
}

function checkSiblingLabels(nodes: readonly FilterOption[], parent: string | null) {
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.label)) issues.push(`同级重名：${parent ?? "根"} / ${node.label}`);
    seen.add(node.label);
    if (node.children?.length) checkSiblingLabels(node.children, node.label);
  }
}
checkSiblingLabels(options, null);

const ingredientRoot = tagIndex.findByName("食材");
if (!ingredientRoot) {
  issues.push("食材根不存在");
} else {
  const claimed = new Set<number>();
  for (const group of INGREDIENT_TAG_GROUPS) {
    if (group.kind === "roots") {
      for (const name of group.rootNames) {
        const tag = tagIndex.findByName(name);
        if (!tag) issues.push(`食材分组根不存在：${name}`);
        else claimed.add(tag.id);
      }
      continue;
    }
    const tag = tagIndex.findByName(group.rootName);
    if (!tag) {
      issues.push(`食材分组根不存在：${group.rootName}`);
      continue;
    }
    claimed.add(tag.id);
    if (tagIndex.subtree(tag.id).length <= 1) issues.push(`食材分组没有子级：${group.label}`);
  }
  for (const name of INGREDIENT_USAGE_EXCLUDED) {
    if (!tagIndex.findByName(name)) issues.push(`食材排除标签不存在：${name}`);
  }
  const unclaimed = tagIndex
    .subtree(ingredientRoot.id)
    .filter((tag) => tag.parentId === ingredientRoot.id && !claimed.has(tag.id));
  for (const tag of unclaimed)
    issues.push(`食材一级标签未归属分组：${tag.internalName}（${tag.displayName ?? "无显示名"}）`);

  const source = createIngredientTagSource(tagIndex, records);
  const recordIds = new Set(records.map((record) => record.id));
  const ingredientCount = source.itemIds.filter((id) => recordIds.has(id)).length;
  for (const tag of source.tags) {
    if (!source.visibleIds.has(tag.id)) continue;
    if (/[_]|父级/.test(tag.name)) issues.push(`可见食材标签仍含内部命名：${tag.name}`);
  }
  const siblingNames = new Map<number | null, Set<string>>();
  for (const tag of source.tags) {
    if (!source.visibleIds.has(tag.id)) continue;
    const seen = siblingNames.get(tag.parentId) ?? new Set<string>();
    if (seen.has(tag.name)) issues.push(`食材同级重名：${tag.name}`);
    seen.add(tag.name);
    siblingNames.set(tag.parentId, seen);
  }
  console.log(
    `食材标签检查：${INGREDIENT_TAG_GROUPS.length} 组，${source.visibleIds.size} 个可见标签，${ingredientCount} 种食材。`,
  );
}

if (issues.length > 0) {
  for (const issue of issues) console.error(`- ${issue}`);
  throw new Error(`标签筛选策略检查失败：${issues.length} 项问题`);
}

console.log(
  `标签筛选策略检查通过：${options.length} 个根，${flattened.length} 个可见标签，${records.length} 条正式物品。`,
);
