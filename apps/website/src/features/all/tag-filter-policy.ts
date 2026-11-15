import { TAG_LABEL_OVERRIDES, TAG_LABEL_PREFIXES, type TagTreePolicy } from "../collection/tags.ts";

// 修改白名单、前缀或特例后，同步更新 docs/tag-filter-policy.md。
export const TAG_FILTER_ROOT_NAMES = [
  "颜色",
  "材质",
  "艺术风格",
  "家具",
  "服装",
  "生物",
  "食物",
  "食材",
  "尺寸",
  "产区分类",
  "烹饪原料",
  "素材",
  "手持物",
] as const;

export const ALL_TAG_FILTER_POLICY: TagTreePolicy = {
  rootNames: TAG_FILTER_ROOT_NAMES,
  labelOverrides: TAG_LABEL_OVERRIDES,
  labelPrefixes: TAG_LABEL_PREFIXES,
};
