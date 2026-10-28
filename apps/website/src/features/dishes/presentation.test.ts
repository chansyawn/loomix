import { describe, expect, it } from "vite-plus/test";
import type { DishItem } from "../collection-view.ts";
import {
  difficultyRequirementLabel,
  effectSummary,
  effectValues,
  formatTastes,
} from "./presentation";

const dish: DishItem = {
  id: 1,
  name: "测试菜肴",
  image: null,
  description: null,
  quality: null,
  difficulty: null,
  galaxyFlavor: null,
  cookware: null,
  effectsText: "增加 40 力气",
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
  difficultyRequirement: null,
  acquisition: "烹饪",
  recipe: null,
};

describe("dish presentation", () => {
  it("formats tastes and combines basic and structured effect values", () => {
    expect(formatTastes(dish.tastes)).toBe("甜 / 咸");
    expect(formatTastes(null)).toBeNull();
    expect(effectValues(dish)).toEqual(["增加 40 力气", "大力播洒 一阶"]);
    expect(effectSummary(dish)).toBe("增加 40 力气 · 大力播洒 一阶");
    expect(effectSummary({ ...dish, effectsText: null, effects: null })).toBeNull();
  });

  it("formats known, absent and unresolved unlock requirements", () => {
    expect(difficultyRequirementLabel(null)).toBe("无额外条件");
    expect(
      difficultyRequirementLabel({
        rawExpression: "condition",
        condition: { kind: "chefLevelGreaterOrEqual", level: 5 },
        unresolvedReason: null,
      }),
    ).toBe("厨师等级 ≥ 5");
    expect(
      difficultyRequirementLabel({
        rawExpression: "condition",
        condition: { kind: "learnCookRecipeInCategory", categoryId: 4 },
        unresolvedReason: null,
      }),
    ).toBe("学会指定类别菜谱（类别 4）");
    expect(
      difficultyRequirementLabel({
        rawExpression: "condition",
        condition: null,
        unresolvedReason: "unsupported",
      }),
    ).toBe("条件未解析");
  });
});
