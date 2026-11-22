import type { WebsiteResources } from "@loomix/schema/website-resources";
import { expect, test } from "vite-plus/test";
import { assertReleaseChecks, collectReleaseChecks, runReleaseChecks } from "./run.ts";
import type { ReleaseCheck } from "./types.ts";

const release = {} as WebsiteResources;
const passing: ReleaseCheck = {
  id: "passing",
  run: () => ({ summary: "通过", issues: [] }),
};
const failing: ReleaseCheck = {
  id: "failing",
  run: () => ({ issues: [{ path: "catalog", message: "发现问题" }] }),
};
const broken: ReleaseCheck = {
  id: "broken",
  run: () => {
    throw new Error("检查崩溃");
  },
};

test("收集成功、失败和抛异常的检查", async () => {
  const outcomes = await collectReleaseChecks(release, [passing, failing, broken]);
  expect(outcomes.map((outcome) => outcome.check.id)).toEqual(["passing", "failing", "broken"]);
  expect(outcomes[0].issues).toEqual([]);
  expect(outcomes[1].issues).toEqual([{ path: "catalog", message: "发现问题" }]);
  expect(outcomes[2].issues[0].message).toContain("检查执行失败：检查崩溃");
  expect(outcomes[2].error).toBeInstanceOf(Error);
});

test("拒绝重复的检查 ID", async () => {
  await expect(collectReleaseChecks(release, [passing, passing])).rejects.toThrow(
    "发布契约检查 ID 重复：passing",
  );
});

test("按 issue 数量统计失败", async () => {
  const outcomes = await collectReleaseChecks(release, [passing, failing, broken]);
  expect(() => assertReleaseChecks(outcomes)).toThrow("发布契约检查失败：2 项问题");
});

test("全部通过时 runReleaseChecks 正常结束", async () => {
  await expect(runReleaseChecks(release, [passing])).resolves.toBeUndefined();
});

test("存在问题时 runReleaseChecks 失败", async () => {
  await expect(runReleaseChecks(release, [failing])).rejects.toThrow("发布契约检查失败：1 项问题");
});
