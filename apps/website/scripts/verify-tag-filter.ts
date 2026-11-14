import { readFileSync } from "node:fs";
import path from "node:path";
import { isGroupRecord, parseCatalog } from "@loomix/schema/catalog";
import { createGameplayTagIndex, parseGameplayTags } from "@loomix/schema/gameplay-tags";
import {
  ALL_TAG_FILTER_POLICY,
  TAG_FILTER_ROOT_NAMES,
  TAG_LABEL_OVERRIDES,
} from "../src/features/all/tag-filter-policy.ts";
import {
  flattenFilterOptions,
  type FilterOption,
} from "../src/features/collection/filter-types.ts";
import { createCollectionTagFilter } from "../src/features/collection/tags.ts";
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
const records = catalog.records.filter((record) => !isGroupRecord(record));
const filter = createCollectionTagFilter(
  tagDocument.tags,
  createGameplayTagIndex(tagDocument.tags),
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

if (issues.length > 0) {
  for (const issue of issues) console.error(`- ${issue}`);
  throw new Error(`标签筛选策略检查失败：${issues.length} 项问题`);
}

console.log(
  `标签筛选策略检查通过：${options.length} 个根，${flattened.length} 个可见标签，${records.length} 条正式物品。`,
);
