import type { TagTreePolicy } from "../collection/tags";

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

export const TAG_LABEL_OVERRIDES: Readonly<Record<string, string>> = {
  产区分类: "产区",
  种植作物分类: "作物分类",
  生物移动模式: "移动方式",
  鱼版型分类: "鱼体型",
  生物花纹: "花纹",
  活动时间: "活跃时间",
  赶海生物特征: "赶海特征",
  含水果父级: "含水果类",
  含谷物父级: "含谷物类",
  含蔬菜父级: "含蔬菜类",
  含海鲜父级: "含海鲜类",
  容器_水果: "水果容器",
  食材_颜色: "颜色分类",
  Diy素材: "DIY 材料",
  手部饰品: "手部配饰",
};

export const TAG_LABEL_PREFIXES = ["食材_", "容器_", "食物_"] as const;

export const ALL_TAG_FILTER_POLICY: TagTreePolicy = {
  rootNames: TAG_FILTER_ROOT_NAMES,
  labelOverrides: TAG_LABEL_OVERRIDES,
  labelPrefixes: TAG_LABEL_PREFIXES,
};
