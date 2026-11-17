import { describe, expect, it } from "vite-plus/test";
import type { DishItem } from "../collection-view.ts";
import { unlockConditionLabel, effectSummary, effectValues, formatTastes } from "./presentation";

const dish: DishItem = {
  id: 1,
  name: "测试菜肴",
  image: null,
  description: null,
  quality: null,
  difficulty: null,
  galaxyFlavor: null,
  cookware: null,
  strength: 40,
  effects: [
    {
      effectId: 1,
      name: "大力播洒 一阶",
      description: "浇水范围提升",
      level: 1,
      uses: null,
      durationSeconds: 10,
    },
  ],
  tastes: ["甜", "咸"],
  unlockCondition: null,
  acquisition: "烹饪",
  slots: [],
};

describe("dish presentation", () => {
  it("formats tastes and combines basic and structured effect values", () => {
    expect(formatTastes(dish.tastes)).toBe("甜 / 咸");
    expect(formatTastes(null)).toBeNull();
    expect(effectValues(dish)).toEqual(["增加 40 力气", "大力播洒 一阶"]);
    expect(effectSummary(dish)).toBe("增加 40 力气 · 大力播洒 一阶");
    expect(effectSummary({ ...dish, strength: null, effects: null })).toBeNull();
  });

  it("formats known and absent unlock conditions", () => {
    expect(unlockConditionLabel(null)).toBe("无额外条件");
    expect(unlockConditionLabel({ kind: "chefLevelGreaterOrEqual", level: 5 })).toBe(
      "厨师等级 ≥ 5",
    );
    expect(unlockConditionLabel({ kind: "learnCookRecipeInCategory", categoryId: 4 })).toBe(
      "学会指定类别菜谱（类别 4）",
    );
  });
});
