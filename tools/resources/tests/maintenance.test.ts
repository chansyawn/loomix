import { expect, test, vi } from "vite-plus/test";
import { applyCleanup, listReleases, planCleanup, runCleanup } from "../src/maintenance.ts";
import { sha256 } from "../src/release.ts";
import type { MaintenanceStore, StoredObject } from "../src/store.ts";

const now = new Date("2026-11-20T00:00:00Z");
const old = new Date("2026-10-01T00:00:00Z");
const recent = new Date("2026-11-18T00:00:00Z");

function fixture() {
  const objects = new Map<string, StoredObject & { bytes: Uint8Array }>();
  const put = (key: string, bytes: Uint8Array, modified = old) =>
    objects.set(key, { key, bytes, modified, size: bytes.length });
  const json = (key: string, value: unknown, modified?: Date) =>
    put(key, Buffer.from(JSON.stringify(value)), modified);
  const image = (label: string, modified?: Date) => {
    const bytes = Buffer.from(label);
    const sha = sha256(bytes);
    const file = `assets/${sha}.webp`;
    const key = `images/${sha}.webp`;
    put(key, bytes, modified);
    return { file, key, sha256: sha };
  };
  const store: MaintenanceStore = {
    list: async (prefix) => [...objects.values()].filter(({ key }) => key.startsWith(prefix)),
    read: async (key) => {
      const data = objects.get(key);
      if (!data) throw new Error(`找不到 ${key}`);
      return data.bytes;
    },
    remove: async (keys) => {
      for (const key of keys) objects.delete(key);
    },
  };
  const release = (id: string, images: ReturnType<typeof image>[], legacy = false) => {
    const prefix = `releases/${id}/`;
    const index = Buffer.from(
      JSON.stringify({ images: images.map(({ file, sha256 }) => ({ file, sha256 })) }),
    );
    put(`${prefix}assets.json`, index);
    const manifest = Buffer.from(
      JSON.stringify({
        formatVersion: "来自不同的领域契约",
        files: [
          { kind: "assets", path: "assets.json", sha256: sha256(index), bytes: index.length },
        ],
      }),
    );
    put(`${prefix}release.json`, manifest);
    json(`${prefix}_complete.json`, {
      release: id,
      manifestSha256: sha256(manifest),
      ...(legacy ? {} : { storageLayout: "shared-images-v1" }),
    });
    json(`${prefix}_upload.json`, {});
  };
  return { store, objects, json, image, release };
}

test("清理指定版本和超龄孤儿，保留跨版本图片、占号和较新的对象", async () => {
  const { store, objects, json, image, release } = fixture();
  const shared = image("shared");
  const orphan = image("orphan");
  const retained = image("retained");
  const fresh = image("fresh", recent);
  release("live", [shared]);
  release("selected", [shared, orphan]);
  release("retained", [retained]);
  release("legacy", [], true);
  json("releases/selected/_retired.json", { release: "selected" });
  json("releases/retained/_retired.json", { release: "retained" });
  json("releases/abandoned/_upload.json", {});
  json("releases/abandoned/release.json", {});
  json("releases/unfinished/_upload.json", {});
  json("releases/unfinished/release.json", {}, recent);
  json("images/other.json", {});
  json(orphan.file, {});

  const plan = await planCleanup(store, ["selected"], now);
  expect(plan.selectedReleases).toEqual(["selected"]);
  expect(plan.releasesToRemove).toEqual(["abandoned", "selected"]);
  expect(plan.orphanImages).toEqual([orphan.key]);
  expect(plan.completionMarkers).toEqual(["releases/selected/_complete.json"]);
  expect(plan.objectCount).toBe(6);
  expect(objects.has(orphan.key)).toBe(true);
  await applyCleanup(store, plan);

  expect(objects.has("releases/selected/_upload.json")).toBe(true);
  expect(objects.has("releases/selected/_retired.json")).toBe(false);
  expect(objects.has("releases/legacy/_complete.json")).toBe(true);
  expect(objects.has("releases/unfinished/release.json")).toBe(true);
  expect(objects.has("images/other.json")).toBe(true);
  expect(objects.has(orphan.file)).toBe(true);
  expect(objects.has(retained.key)).toBe(true);
  expect(objects.has(shared.key)).toBe(true);
  expect(objects.has(fresh.key)).toBe(true);
  expect(objects.has(orphan.key)).toBe(false);
  expect((await planCleanup(store, ["selected"], now)).objectCount).toBe(0);
});

test("保留版本任何哈希链环节失效时拒绝生成清理计划", async () => {
  const { store, json, release } = fixture();
  release("live", []);
  release("retained", []);
  json("releases/retained/assets.json", { images: ["损坏"] });
  await expect(planCleanup(store, [], now)).rejects.toThrow("图片索引大小或哈希不符");
  await expect(planCleanup(store, ["unlisted"], now)).rejects.toThrow("找不到要清理的资源版本");
});

test("未指定版本时仅清理超龄的未完成上传和孤儿图片", async () => {
  const { store, release, json, image } = fixture();
  const live = image("live");
  const orphan = image("orphan");
  release("live", [live]);
  json("releases/live/_retired.json", { release: "live" });
  json("releases/abandoned/_upload.json", {});
  json("releases/abandoned/release.json", {});
  expect(await listReleases(store)).toEqual([
    { release: "abandoned", completedAt: undefined },
    { release: "live", completedAt: old },
  ]);
  expect(await planCleanup(store, [], now)).toMatchObject({
    completionMarkers: [],
    releaseFiles: ["releases/abandoned/release.json"],
    orphanImages: [orphan.key],
  });
});

test("删除版本文档中断后可重跑，共享图片最后删除", async () => {
  const { store, objects, image, json, release } = fixture();
  const orphan = image("orphan");
  release("live", []);
  release("selected", [orphan]);
  json("releases/selected/_upload.json", {}, recent);
  const remove = store.remove.bind(store);
  const removeSpy = vi.spyOn(store, "remove").mockImplementation(async (keys) => {
    if (keys.includes("releases/selected/assets.json")) throw new Error("删除中断");
    await remove(keys);
  });
  const plan = await planCleanup(store, ["selected"], now);
  await expect(applyCleanup(store, plan)).rejects.toThrow("删除中断");
  expect(objects.has("releases/selected/_complete.json")).toBe(false);
  expect(objects.has(orphan.key)).toBe(true);
  removeSpy.mockRestore();
  await applyCleanup(store, await planCleanup(store, ["selected"], now));
  expect(objects.has("releases/selected/assets.json")).toBe(false);
  expect(objects.has(orphan.key)).toBe(false);
});

test("清理执行前复核目标桶和计划，计划变化时保留对象", async () => {
  const { store, objects, image } = fixture();
  const orphan = image("orphan");
  const report = vi.fn<Parameters<typeof runCleanup>[2]>();
  const options = { bucket: "resources-test", releaseIds: [] };
  await runCleanup(store, options, report);
  const plan = report.mock.calls[0][0];
  expect(plan.orphanImages).toEqual([orphan.key]);
  await expect(
    runCleanup(store, { ...options, bucket: "other", applyPlanId: plan.planId }, report),
  ).rejects.toThrow("清理计划已变化");
  const added = image("added");
  await expect(runCleanup(store, { ...options, applyPlanId: plan.planId }, report)).rejects.toThrow(
    "清理计划已变化",
  );
  expect(objects.has(orphan.key)).toBe(true);
  expect(objects.has(added.key)).toBe(true);
  expect(report).toHaveBeenCalledTimes(1);
  await runCleanup(store, options, report);
  await runCleanup(store, { ...options, applyPlanId: report.mock.calls[1][0].planId }, report);
  expect(objects.size).toBe(0);
});
