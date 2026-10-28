import type { DishItem } from "../collection-view.ts";

export function formatTastes(tastes: DishItem["tastes"]): string | null {
  return tastes?.join(" / ") ?? null;
}

export function effectValues(item: DishItem): string[] {
  return [item.effectsText, ...(item.effects?.map((effect) => effect.name) ?? [])].filter(
    (value): value is string => value !== null && value.length > 0,
  );
}

export function effectSummary(item: DishItem): string | null {
  const values = [...new Set(effectValues(item))];
  return values.length > 0 ? values.join(" · ") : null;
}

export function difficultyRequirementLabel(requirement: DishItem["difficultyRequirement"]): string {
  if (requirement === null) return "无额外条件";
  if (requirement.condition === null) return "条件未解析";
  switch (requirement.condition.kind) {
    case "chefLevelGreaterOrEqual":
      return `厨师等级 ≥ ${requirement.condition.level}`;
    case "learnCookRecipeInCategory":
      return `学会指定类别菜谱（类别 ${requirement.condition.categoryId}）`;
  }
}
