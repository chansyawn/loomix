import { expect, test } from "vite-plus/test";
import { createReleaseId } from "../src/release-id.ts";
import { source } from "./fixture.ts";

const manifest = { source: { ...source, gameVersion: "0.95.2" }, formatVersion: 11 as const };

test("使用 UTC 日期、实际来源版本和三位序号命名", () => {
  const date = new Date("2026-11-18T00:15:00+08:00");
  expect(createReleaseId(manifest, 1, date)).toBe("20261117-g0.95.2-f11-r001");
  expect(createReleaseId(manifest, 999, date)).toBe("20261117-g0.95.2-f11-r999");
  expect(createReleaseId(manifest, 1, new Date("2026-11-18T00:00:00Z"))).toBe(
    "20261118-g0.95.2-f11-r001",
  );
});

test.each([0, -1, 1000, 1.5, Number.NaN])("拒绝超出范围的序号 %s", (sequence) => {
  expect(() => createReleaseId(manifest, sequence)).toThrow("1～999");
});
