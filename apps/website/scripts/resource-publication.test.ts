import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { FORMAT_VERSION } from "@loomix/schema/common";
import { writeFixture } from "../../../tools/resource-publisher/tests/fixture.ts";
import { sha256 } from "@loomix/resource-publisher/release";
import type { ReleaseStore } from "@loomix/resource-publisher/publish";
import { publishWebsiteResources } from "./resource-publication.ts";
import type { PublicationDependencies } from "./resource-publication.ts";

const roots: string[] = [];
const firstId = `20261117-gtest-f${FORMAT_VERSION}-r001`;
const secondId = `20261117-gtest-f${FORMAT_VERSION}-r002`;
const original = '{"resourceBaseUrl":"https://assets.loomix.fun/releases/old/"}\n';

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "loomix-publication-"));
  roots.push(root);
  const directory = path.join(root, "resources/website");
  const release = await writeFixture(directory, 0);
  const pointer = path.join(root, "apps/website/release.json");
  await mkdir(path.dirname(pointer), { recursive: true });
  await writeFile(pointer, original);
  const objects = new Map<string, Uint8Array>();
  const store: ReleaseStore = {
    tryReserve: vi.fn(async (key: string, bytes: Uint8Array) => {
      if (objects.has(key)) return false;
      objects.set(key, bytes);
      return true;
    }),
    put: vi.fn(async (key: string, bytes: Uint8Array) => {
      if (objects.has(key)) throw new Error("禁止覆盖");
      objects.set(key, bytes);
    }),
    verify: vi.fn(async (key: string, size: number, hash: string) => {
      const bytes = objects.get(key);
      if (!bytes || bytes.length !== size || sha256(bytes) !== hash)
        throw new Error("资源完整性错误");
    }),
  };
  const request = vi.fn<typeof fetch>(async (input, init) => {
    expect(new Headers(init?.headers).get("Origin")).toBe("https://loomix.fun");
    const url = input instanceof Request ? input.url : String(input);
    const bytes = objects.get(new URL(url).pathname.slice(1));
    return new Response(bytes ? new Uint8Array(bytes) : "missing", {
      status: bytes ? 200 : 404,
      headers: {
        "access-control-allow-origin": "https://loomix.fun",
        "cache-control": "no-store",
      },
    });
  });
  const dependencies: PublicationDependencies = {
    createStore: vi.fn(() => store),
    check: vi.fn(async () => {}),
    request,
    now: () => new Date("2026-11-17T06:30:00Z"),
    warn: vi.fn(),
  };
  return { root, directory, pointer, objects, store, dependencies, ...release };
}

test("完整发布经过两次网站检查，最终指向实际占号的远程资源", async () => {
  const { root, pointer, objects, dependencies, dataset } = await fixture();
  objects.set(`releases/${firstId}/_upload.json`, Buffer.from("occupied"));
  vi.stubEnv("VITE_RESOURCE_BASE_URL", "https://unrelated.example/releases/override/");
  const result = await publishWebsiteResources(root, false, dependencies);
  expect(result).toMatchObject({ release: secondId, pointerUpdated: true, dryRun: false });
  expect(JSON.parse(await readFile(pointer, "utf8"))).toEqual({
    resourceBaseUrl: `https://assets.loomix.fun/releases/${secondId}/`,
  });
  expect(dependencies.check).toHaveBeenCalledTimes(2);
  expect(vi.mocked(dependencies.check).mock.calls.map(([release]) => release.dataset)).toEqual([
    dataset,
    dataset,
  ]);
  expect(objects.has(`releases/${secondId}/_complete.json`)).toBe(true);
  await expect(access(path.join(root, "var/scratch/resources-publish.lock"))).rejects.toThrow();
  expect(await readdir(path.dirname(pointer))).toEqual(["release.json"]);
});

test("dry-run 不初始化凭证、不联网、不创建锁或修改指针", async () => {
  const { root, pointer, dependencies } = await fixture();
  const result = await publishWebsiteResources(root, true, dependencies);
  expect(result).toMatchObject({
    release: firstId,
    dryRun: true,
    reserved: false,
    pointerUpdated: false,
  });
  expect(dependencies.check).toHaveBeenCalledTimes(1);
  expect(dependencies.createStore).not.toHaveBeenCalled();
  expect(dependencies.request).not.toHaveBeenCalled();
  expect(await readFile(pointer, "utf8")).toBe(original);
  await expect(access(path.join(root, "var"))).rejects.toThrow();
});

test("旧格式资源在任何远程操作前失败，提示重新生成交付", async () => {
  const { root, directory, pointer, dependencies, manifest } = await fixture();
  await writeFile(
    path.join(directory, "release.json"),
    JSON.stringify({ ...manifest, formatVersion: 10 }),
  );
  await expect(publishWebsiteResources(root, false, dependencies)).rejects.toThrow(
    "不能只修改 formatVersion",
  );
  expect(dependencies.createStore).not.toHaveBeenCalled();
  expect(dependencies.request).not.toHaveBeenCalled();
  expect(await readFile(pointer, "utf8")).toBe(original);
});

test("本地网站检查失败时不占号，且释放发布锁", async () => {
  const { root, pointer, dependencies, objects } = await fixture();
  vi.mocked(dependencies.check).mockRejectedValue(new Error("本地契约错误"));
  await expect(publishWebsiteResources(root, false, dependencies)).rejects.toThrow("本地契约错误");
  expect(objects.size).toBe(0);
  expect(dependencies.createStore).not.toHaveBeenCalled();
  expect(await readFile(pointer, "utf8")).toBe(original);
  await expect(access(path.join(root, "var/scratch/resources-publish.lock"))).rejects.toThrow();
});

test("上传失败保留占号，报告实际 ID 和地址且不切换指针", async () => {
  const { root, pointer, dependencies, objects, store } = await fixture();
  vi.spyOn(store, "put").mockRejectedValue(new Error("上传失败"));
  await expect(publishWebsiteResources(root, false, dependencies)).rejects.toThrow(
    `资源地址：https://assets.loomix.fun/releases/${firstId}/`,
  );
  expect(objects.has(`releases/${firstId}/_upload.json`)).toBe(true);
  expect(objects.has(`releases/${firstId}/_complete.json`)).toBe(false);
  expect(dependencies.request).not.toHaveBeenCalled();
  expect(await readFile(pointer, "utf8")).toBe(original);
});

test.each(["网络", "哈希", "网站检查"])(
  "远程%s失败后报告已发布版本及恢复路径，不修改指针",
  async (failure) => {
    const { root, pointer, dependencies, objects } = await fixture();
    if (failure === "网络")
      vi.mocked(dependencies.request).mockRejectedValue(new Error("网络失败"));
    if (failure === "网站检查")
      vi.mocked(dependencies.check)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("远程契约错误"));
    if (failure === "哈希") {
      const request = dependencies.request;
      dependencies.request = async (input, init) => {
        if ((input instanceof Request ? input.url : String(input)).endsWith("_complete.json"))
          objects.set(
            `releases/${firstId}/_complete.json`,
            Buffer.from(
              JSON.stringify({
                release: firstId,
                manifestSha256: "b".repeat(64),
                storageLayout: "shared-images-v1",
              }),
            ),
          );
        return request(input, init);
      };
    }
    await expect(publishWebsiteResources(root, false, dependencies)).rejects.toThrow(
      `VITE_RESOURCE_BASE_URL=https://assets.loomix.fun/releases/${firstId}/ vp run website#verify-release`,
    );
    expect(objects.has(`releases/${firstId}/_complete.json`)).toBe(true);
    expect(await readFile(pointer, "utf8")).toBe(original);
  },
);

test("指针被外部修改后保留其改动，并保留可恢复的已发布资源", async () => {
  const { root, pointer, dependencies, objects } = await fixture();
  const edited = '{"resourceBaseUrl":"https://assets.loomix.fun/releases/external/"}\n';
  vi.mocked(dependencies.check)
    .mockResolvedValueOnce(undefined)
    .mockImplementationOnce(async () => {
      await writeFile(pointer, edited);
    });
  await expect(publishWebsiteResources(root, false, dependencies)).rejects.toThrow(
    "资源指针已变化",
  );
  expect(await readFile(pointer, "utf8")).toBe(edited);
  expect(objects.has(`releases/${firstId}/_complete.json`)).toBe(true);
  expect(await readdir(path.dirname(pointer))).toEqual(["release.json"]);
});
