import { expect, test } from "vite-plus/test";
import type { EvidenceSource } from "../../evidence/domain-schema.ts";
import { resolveVignetteAdmissions } from "./admissions.ts";

const trackerSource: EvidenceSource = { kind: "asset", file: "config.blk", pathId: "1" };
const taskSource: EvidenceSource = { kind: "asset", file: "config.blk", pathId: "2" };
const levelSource: EvidenceSource = {
  kind: "table",
  file: "prepared/ed.obb",
  table: 289,
  rowOffset: 100,
  fields: [0],
};
const level = (value: number) => ({
  thresh: 1,
  habitatArchitectLevelGreaterOrEqual: { level: value },
});
const restored = (habitatId: number) => ({ thresh: 1, habitatRestored: { habitatId } });

test("按明确的任务、装饰能力和可追溯的前置布景准入", () => {
  const conditions = new Map<number, unknown>([
    [601, restored(8002)],
    [602, restored(8005)],
    [603, level(6)],
    [604, level(7)],
    [605, restored(8009)],
    [606, restored(8008)],
    [607, restored(9999)],
    [608, restored(8003)],
    [609, { ...level(6), habitatRestored: { habitatId: 8005 } }],
  ]);
  const results = resolveVignetteAdmissions(
    [
      { id: 8001, name: "二级前置地", discoveryKey: 601 },
      { id: 8002, name: "一级前置地", discoveryKey: 602 },
      { id: 8003, name: "测试地(test)", discoveryKey: 603 },
      { id: 8004, name: "高级地", discoveryKey: 603 },
      { id: 8005, name: "任务地", discoveryKey: null },
      { id: 8006, name: "未配置等级地", discoveryKey: 604 },
      { id: 8007, name: "未配置发现条件地", discoveryKey: 999 },
      { id: 8008, name: "循环地甲", discoveryKey: 605 },
      { id: 8009, name: "循环地乙", discoveryKey: 606 },
      { id: 8010, name: "断链地", discoveryKey: 607 },
      { id: 8011, name: "测试前置地", discoveryKey: 608 },
      { id: 8012, name: "复合条件地", discoveryKey: 609 },
    ],
    new Map([[6, levelSource]]),
    {
      task: (id) => (id === 8003 || id === 8005 ? { taskId: 300, source: taskSource } : undefined),
      tracker: (id) =>
        conditions.has(id) ? { condition: conditions.get(id), source: trackerSource } : undefined,
    },
  );
  expect(results.get(8001)?.decision).toEqual({ kind: "prerequisite", templateId: 8002 });
  expect(results.get(8002)?.decision).toEqual({ kind: "prerequisite", templateId: 8005 });
  expect(results.get(8003)?.decision).toEqual({ kind: "test" });
  expect(results.get(8004)).toEqual({
    decision: { kind: "architectLevel", level: 6 },
    sources: [trackerSource, levelSource],
  });
  expect(results.get(8005)).toEqual({
    decision: { kind: "task", taskId: 300 },
    sources: [taskSource],
  });
  for (const id of [8006, 8007, 8008, 8009, 8010, 8011, 8012]) {
    expect(results.get(id)?.decision).toEqual({ kind: "unconfirmed" });
  }
});
