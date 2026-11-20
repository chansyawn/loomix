import { expect, test, vi } from "vite-plus/test";
import { applyCleanup, listReleases, planCleanup, setReleaseRetired } from "../src/maintenance.ts";
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
    put(file, bytes, modified);
    return { file, sha256: sha };
  };
  const store: MaintenanceStore = {
    list: async (prefix) => [...objects.values()].filter(({ key }) => key.startsWith(prefix)),
    read: async (key) => {
      const data = objects.get(key);
      if (!data) throw new Error(`找不到 ${key}`);
      return data.bytes;
    },
    tryReserve: async (key, bytes) => {
      if (objects.has(key)) return false;
      put(key, bytes);
      return true;
    },
    remove: async (keys) => {
      for (const key of keys) objects.delete(key);
    },
  };
  const release = (id: string, images: ReturnType<typeof image>[], legacy = false) => {
    const prefix = `releases/${id}/`;
    const index = Buffer.from(JSON.stringify({ images }));
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
      ...(legacy ? {} : { storageLayout: "shared-assets-v1" }),
    });
    json(`${prefix}_upload.json`, {});
  };
  return { store, objects, json, image, release };
}

test("回收过期版本和孤儿图片，保留跨版本图片、占号和宽限期内的对象", async () => {
  const { store, objects, json, image, release } = fixture();
  const shared = image("shared");
  const orphan = image("orphan");
  const grace = image("grace");
  const fresh = image("fresh", recent);
  release("live", [shared]);
  release("expired", [shared, orphan]);
  release("grace", [grace]);
  release("legacy", [], true);
  json("releases/expired/_retired.json", { release: "expired" });
  json("releases/grace/_retired.json", { release: "grace" }, recent);
  json("releases/abandoned/_upload.json", {});
  json("releases/abandoned/release.json", {});
  json("releases/unfinished/_upload.json", {}, recent);
  json("releases/unfinished/release.json", {}, recent);
  json("assets/other.json", {});

  const plan = await planCleanup(store, ["live"], now);
  expect(plan.expiredReleases).toEqual(["abandoned", "expired"]);
  expect(plan.orphanImages).toEqual([orphan.file]);
  expect(plan.completionMarkers).toEqual(["releases/expired/_complete.json"]);
  expect(plan.objectCount).toBe(5);
  expect(objects.has(orphan.file)).toBe(true);
  await applyCleanup(store, plan);

  expect(objects.has("releases/expired/_upload.json")).toBe(true);
  expect(objects.has("releases/expired/_retired.json")).toBe(true);
  expect(objects.has("releases/legacy/_complete.json")).toBe(true);
  expect(objects.has("releases/unfinished/release.json")).toBe(true);
  expect(objects.has("assets/other.json")).toBe(true);
  expect(objects.has(grace.file)).toBe(true);
  expect(objects.has(shared.file)).toBe(true);
  expect(objects.has(fresh.file)).toBe(true);
  expect(objects.has(orphan.file)).toBe(false);
  expect((await planCleanup(store, ["live"], now)).objectCount).toBe(0);
});

test("保留版本任何哈希链环节失效时拒绝生成清理计划", async () => {
  const { store, json, release } = fixture();
  release("live", []);
  release("retained", []);
  json("releases/retained/assets.json", { images: ["损坏"] });
  await expect(planCleanup(store, ["live"], now)).rejects.toThrow("图片索引大小或哈希不符");
  await expect(planCleanup(store, ["unlisted"], now)).rejects.toThrow("缺少完成标记");
  await expect(planCleanup(store, [], now)).rejects.toThrow("至少");
});

test("退役保护与恢复重置保留状态", async () => {
  const { store, release } = fixture();
  release("live", []);
  await expect(setReleaseRetired(store, "live", true, ["live"])).rejects.toThrow("受到保护");
  await setReleaseRetired(store, "live", true, ["other"]);
  expect(await listReleases(store)).toEqual([
    { release: "live", completedAt: old, retiredAt: old },
  ]);
  await expect(planCleanup(store, ["live"], now)).rejects.toThrow("请先恢复");
  await setReleaseRetired(store, "live", false);
  await expect(planCleanup(store, ["live"], now)).resolves.toMatchObject({ objectCount: 0 });
});

test("删除版本文档中断后可重跑，共享图片最后删除", async () => {
  const { store, objects, image, json, release } = fixture();
  const orphan = image("orphan");
  release("live", []);
  release("expired", [orphan]);
  json("releases/expired/_retired.json", { release: "expired" });
  const remove = store.remove.bind(store);
  const removeSpy = vi.spyOn(store, "remove").mockImplementation(async (keys) => {
    if (keys.includes("releases/expired/assets.json")) throw new Error("删除中断");
    await remove(keys);
  });
  const plan = await planCleanup(store, ["live"], now);
  await expect(applyCleanup(store, plan)).rejects.toThrow("删除中断");
  expect(objects.has("releases/expired/_complete.json")).toBe(false);
  expect(objects.has(orphan.file)).toBe(true);
  removeSpy.mockRestore();
  await applyCleanup(store, await planCleanup(store, ["live"], now));
  expect(objects.has(orphan.file)).toBe(false);
});
