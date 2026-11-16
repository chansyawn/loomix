import {
  TAG_LABEL_OVERRIDES,
  TAG_LABEL_PREFIXES,
  type TagLabelPolicy,
} from "../collection/tags.ts";

export type IngredientTagGroupKey =
  | "ingredientCategories"
  | "ingredientColors"
  | "ingredientQualities";

export type IngredientTagGroupConfig =
  | {
      key: IngredientTagGroupKey;
      label: string;
      kind: "roots";
      rootNames: readonly string[];
    }
  | {
      key: IngredientTagGroupKey;
      label: string;
      kind: "children";
      rootName: string;
    };

// 修改分组后运行 tag-filter/ingredients 检查；分组语义变化时同步 apps/website/docs/tag-filter-policy.md。
export const INGREDIENT_TAG_GROUPS: readonly IngredientTagGroupConfig[] = [
  {
    key: "ingredientCategories",
    label: "分类",
    kind: "roots",
    rootNames: ["食材_荤菜", "食材_素菜", "食材_原料", "食材_不宜使用"],
  },
  {
    key: "ingredientColors",
    label: "颜色",
    kind: "children",
    rootName: "食材_颜色",
  },
  {
    key: "ingredientQualities",
    label: "食材品质",
    kind: "children",
    rootName: "食材_品阶",
  },
];

export const INGREDIENT_USAGE_EXCLUDED = ["食材_不宜使用"] as const;

export const INGREDIENT_LABEL_POLICY: TagLabelPolicy = {
  labelOverrides: TAG_LABEL_OVERRIDES,
  labelPrefixes: TAG_LABEL_PREFIXES,
};
