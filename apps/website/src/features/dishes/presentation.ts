import type { DishItem } from "../omnidex-view.ts";

export function formatTastes(tastes: DishItem["tastes"]): string | null {
  return tastes?.join(" / ") ?? null;
}

export function dishCardAttributes(item: DishItem) {
  return [formatTastes(item.tastes), item.difficulty, item.cookware].filter(Boolean).join(" · ");
}

export function strengthText(strength: DishItem["strength"]): string | null {
  return strength === null ? null : `增加 ${strength} 力气`;
}

export function effectValues(item: DishItem): string[] {
  return [
    strengthText(item.strength),
    ...(item.effects?.map((effect) => effect.name) ?? []),
  ].filter((value): value is string => value !== null && value.length > 0);
}

export function effectSummary(item: DishItem): string | null {
  const values = [...new Set(effectValues(item))];
  return values.length > 0 ? values.join(" · ") : null;
}

export function unlockConditionLabel(condition: DishItem["unlockCondition"]): string {
  if (condition === undefined) return "解锁资料未收录";
  if (condition === null) return "无额外条件";
  switch (condition.kind) {
    case "chefLevelGreaterOrEqual":
      return `厨师等级 ≥ ${condition.level}`;
    case "learnCookRecipeInCategory":
      return `学会指定类别菜谱（类别 ${condition.categoryId}）`;
  }
}
