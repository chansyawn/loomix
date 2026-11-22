import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { FORMAT_VERSION } from "@loomix/schema/common";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { publishValidatedContent } from "../src/publish.ts";
import type { UploadProgress } from "../src/publish.ts";
import { parseReleaseBase, sha256 } from "../src/release.ts";
import { createR2Store, ObjectMissingError } from "../src/store.ts";
import type { ReleaseStore } from "../src/store.ts";
import { validateContent } from "../src/validate.ts";
import { writeFixture, webp, imageKey, remoteImageKey } from "./fixture.ts";
const directories: string[] = [];
const date = new Date("2026-11-17T06:30:00Z");
const firstId = `20261117-gtest-f${FORMAT_VERSION}-r001`;
const secondId = `20261117-gtest-f${FORMAT_VERSION}-r002`;
async function publishRelease(
  directory: string,
  store: ReleaseStore,
  onProgress?: (progress: UploadProgress) => void,
) {
  return publishValidatedContent(await validateContent(directory), store, onProgress, date);
}
async function fixture(imageCount = 1): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "loomix-publisher-"));
  directories.push(directory);
  await writeFixture(directory, imageCount);
  return directory;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function memoryStore(failKey?: string): { store: ReleaseStore; objects: Map<string, Uint8Array> } {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    store: {
      async tryReserve(key, bytes) {
        if (key === failKey) throw new Error(`Write rejected: ${key}`);
        if (objects.has(key)) return false;
        objects.set(key, bytes);
        return true;
      },
      async put(key, bytes, contentType) {
        if (key.endsWith(".webp")) expect(contentType).toBe("image/webp");
        if (key === failKey || objects.has(key)) throw new Error(`Write rejected: ${key}`);
        objects.set(key, bytes);
      },
      async verify(key, size, hash) {
        const bytes = objects.get(key);
        if (!bytes) throw new ObjectMissingError(`Missing: ${key}`);
        if (bytes.length !== size || sha256(bytes) !== hash) throw new Error("Verification failed");
      },
    },
  };
}

test("发布完整版本，再次发布时占用新序号而不覆盖旧版本", async () => {
  const directory = await fixture();
  const { store, objects } = memoryStore();
  const marker = await publishRelease(directory, store);
  expect(marker).toEqual({
    release: firstId,
    manifestSha256: sha256(await readFile(path.join(directory, "release.json"))),
    storageLayout: "shared-images-v1",
    uploadedImageCount: 1,
    reusedImageCount: 0,
  });
  expect([...objects.keys()].at(-1)).toBe(`releases/${firstId}/_complete.json`);
  expect(objects.has(`releases/${firstId}/zh-CN/neighbors.json`)).toBe(true);
  expect(objects.has(`releases/${firstId}/zh-CN/starsea.json`)).toBe(true);
  expect(objects.has(`releases/${firstId}/zh-CN/vignettes.json`)).toBe(true);
  const write = vi.spyOn(store, "tryReserve");
  expect(await publishRelease(directory, store)).toMatchObject({
    release: secondId,
    uploadedImageCount: 0,
    reusedImageCount: 1,
  });
  expect(write.mock.calls.map(([key]) => key)).toEqual([
    `releases/${firstId}/_upload.json`,
    `releases/${secondId}/_upload.json`,
  ]);
  expect([...objects.keys()].filter((key) => key.endsWith(".webp"))).toEqual([remoteImageKey]);
  expect(objects.has(`releases/${firstId}/_complete.json`)).toBe(true);
});

test("an interrupted upload cannot produce a completion marker or reuse its release ID", async () => {
  const directory = await fixture();
  const { store, objects } = memoryStore(`releases/${firstId}/assets.json`);
  await expect(publishRelease(directory, store)).rejects.toThrow("Write rejected");
  expect(objects.has(`releases/${firstId}/_complete.json`)).toBe(false);
  expect((await publishRelease(directory, store)).release).toBe(secondId);
});

test("a reservation storage error is not reported as an existing release", async () => {
  const directory = await fixture();
  const { store } = memoryStore(`releases/${firstId}/_upload.json`);
  const reserve = vi.spyOn(store, "tryReserve");
  await expect(publishRelease(directory, store)).rejects.toMatchObject({
    release: firstId,
    phase: "reservation",
    message: expect.stringContaining("Write rejected"),
  });
  expect(reserve).toHaveBeenCalledTimes(1);
});

test.each([
  { name: "PreconditionFailed", status: undefined, reserved: false },
  { name: "S3ServiceException", status: 412, reserved: false },
  { name: "ConditionalRequestConflict", status: 409, reserved: false },
  { name: "AccessDenied", status: 403, reserved: true },
  { name: "NetworkingError", status: undefined, reserved: true },
])(
  "R2 reservation maps only conditional conflicts to existing objects: $name",
  async (testCase) => {
    const error = new Error(testCase.name);
    error.name = testCase.name;
    if (testCase.status !== undefined) {
      Object.assign(error, { $metadata: { httpStatusCode: testCase.status } });
    }
    vi.spyOn(S3Client.prototype, "send").mockRejectedValue(error);
    const store = createR2Store("a".repeat(32), "bucket", "key", "secret");
    const reservation = store.tryReserve(
      "releases/r1/_upload.json",
      Buffer.from("{}"),
      "application/json",
      "hash",
    );

    if (testCase.reserved) {
      await expect(reservation).rejects.toBe(error);
    } else {
      await expect(reservation).resolves.toBe(false);
    }
  },
);

test("并发发布通过原子预留获得不同序号", async () => {
  const directory = await fixture();
  const { store } = memoryStore();
  const results = await Promise.all([
    publishRelease(directory, store),
    publishRelease(directory, store),
  ]);
  expect(results.map((result) => result.release).sort()).toEqual([firstId, secondId]);
  expect(results.map((result) => result.uploadedImageCount)).toEqual(
    expect.arrayContaining([0, 1]),
  );
  expect(results.map((result) => result.reusedImageCount)).toEqual(expect.arrayContaining([0, 1]));
});

test("新增图片只上传缺失的共享对象", async () => {
  const { store } = memoryStore();
  await publishRelease(await fixture(), store);
  expect(await publishRelease(await fixture(2), store)).toMatchObject({
    uploadedImageCount: 1,
    reusedImageCount: 1,
  });
});

test.each([403, 404, 503])("只有 HTTP 404 被识别为对象缺失：%s", async (status) => {
  const error = Object.assign(new Error("HEAD failed"), { $metadata: { httpStatusCode: status } });
  vi.spyOn(S3Client.prototype, "send").mockRejectedValue(error);
  const store = createR2Store("a".repeat(32), "bucket", "key", "secret");
  const result = store.verify(remoteImageKey, webp.length, sha256(webp));
  if (status === 404) await expect(result).rejects.toBeInstanceOf(ObjectMissingError);
  else await expect(result).rejects.toBe(error);
});

test("a failed remote integrity check prevents completion", async () => {
  const directory = await fixture();
  const { store, objects } = memoryStore();
  store.verify = async () => {
    throw new Error("Remote integrity mismatch");
  };
  await expect(publishRelease(directory, store)).rejects.toThrow("Remote integrity mismatch");
  expect(objects.has(`releases/${firstId}/_complete.json`)).toBe(false);
});

test("rejects missing, extra, corrupt, and invalidly referenced assets before publication", async () => {
  const directory = await fixture();
  await writeFile(path.join(directory, imageKey), Buffer.from("corrupt"));
  await expect(validateContent(directory)).rejects.toThrow("SHA-256 or size mismatch");
  await rm(path.join(directory, imageKey));
  await expect(validateContent(directory)).rejects.toThrow("exactly the declared");
  await writeFile(path.join(directory, imageKey), webp);
  await writeFile(path.join(directory, "assets/extra.webp"), webp);
  await expect(validateContent(directory)).rejects.toThrow("exactly the declared");
  await rm(path.join(directory, "assets/extra.webp"));
  await writeFile(path.join(directory, "zh-CN/catalog.json"), "{}");
  await expect(validateContent(directory)).rejects.toThrow();
});

test("rejects a non-WebP or truncated container even when its hash matches", async () => {
  for (const bytes of [Buffer.from("not a WebP image"), webp.subarray(0, webp.length - 2)]) {
    const directory = await fixture(0);
    await writeFixture(directory, 1, [bytes]);
    await expect(validateContent(directory)).rejects.toThrow("Invalid WebP container");
  }
});
test.each(["../escape", "r1/path", "", ".", ".."])("rejects unsafe release ID %s", (release) => {
  expect(() => parseReleaseBase(`https://assets.loomix.fun/releases/${release}/`)).toThrow();
});

test("requires an immutable HTTPS release base", () => {
  expect(parseReleaseBase("https://assets.loomix.fun/releases/0.95.2-r1/").pathname).toBe(
    "/releases/0.95.2-r1/",
  );
  for (const value of [
    "http://assets.loomix.fun/releases/r1/",
    "https://assets.loomix.fun/latest/",
    "https://assets.loomix.fun/releases/r1/?q=1",
  ]) {
    expect(() => parseReleaseBase(value)).toThrow();
  }
});

test("allows a regular directory placeholder without publishing it", async () => {
  const directory = await fixture();
  await writeFile(path.join(directory, ".gitkeep"), "");
  const content = await validateContent(directory);
  expect(content.assets.map((asset) => asset.key)).toEqual([imageKey]);
  const { store, objects } = memoryStore();
  await publishRelease(directory, store);
  expect([...objects.keys()].some((key) => key.endsWith(".gitkeep"))).toBe(false);
  await rm(path.join(directory, ".gitkeep"));
  await mkdir(path.join(directory, ".gitkeep"));
  await expect(validateContent(directory)).rejects.toThrow("regular file");
});

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("progress counts remotely verified images and bytes in concurrent completion order", async () => {
  const directory = await fixture(3);
  const content = await validateContent(directory);
  const { store } = memoryStore();
  const verify = store.verify.bind(store);
  const gate = deferred();
  const otherImages = deferred();
  const updates: UploadProgress[] = [];
  const held = content.assets[0];
  store.verify = async (key, size, hash) => {
    await verify(key, size, hash);
    if (key === `images/${held.sha256}.webp`) await gate.promise;
  };
  const publication = publishRelease(directory, store, (progress) => {
    updates.push(progress);
    if (progress.completed === 2) otherImages.resolve();
  });
  try {
    await otherImages.promise;
    expect(updates.map((p) => p.completed)).toEqual([0, 1, 2]);
    expect(updates.at(-1)?.completedBytes).toBe(
      content.assets.slice(1).reduce((sum, a) => sum + a.size, 0),
    );
  } finally {
    gate.resolve();
    await publication;
  }
  expect(updates.map((p) => p.phase)).toEqual([
    "images",
    "images",
    "images",
    "images",
    "finalizing",
    "complete",
  ]);
  expect(updates.at(-1)).toEqual({
    phase: "complete",
    completed: 3,
    total: 3,
    completedBytes: content.assets.reduce((sum, a) => sum + a.size, 0),
    totalBytes: content.assets.reduce((sum, a) => sum + a.size, 0),
  });
});

test("a failed upload suppresses progress from in-flight images and never completes", async () => {
  const directory = await fixture(2);
  const content = await validateContent(directory);
  const { store, objects } = memoryStore();
  const verify = store.verify.bind(store);
  const ready = deferred();
  const gate = deferred();
  const late = deferred();
  const updates: UploadProgress[] = [];
  store.verify = async (key, size, hash) => {
    await verify(key, size, hash);
    if (key === `images/${content.assets[0].sha256}.webp`) {
      await ready.promise;
      throw new Error("Image verification failed");
    }
    ready.resolve();
    await gate.promise;
    late.resolve();
  };
  try {
    await expect(publishRelease(directory, store, (p) => updates.push(p))).rejects.toThrow(
      "Image verification failed",
    );
  } finally {
    gate.resolve();
    await late.promise;
  }
  expect(updates).toHaveLength(1);
  expect(updates[0].completed).toBe(0);
  expect(objects.has(`releases/${firstId}/_complete.json`)).toBe(false);
});

test("zero-image versions report finalization and completion without invalid totals", async () => {
  const updates: UploadProgress[] = [];
  await publishRelease(await fixture(0), memoryStore().store, (p) => updates.push(p));
  expect(updates.map((p) => p.phase)).toEqual(["images", "finalizing", "complete"]);
  expect(
    updates.every(
      (p) => p.total === 0 && p.completed === 0 && p.totalBytes === 0 && p.completedBytes === 0,
    ),
  ).toBe(true);
});

test("failure to verify the completion marker never reports successful publication", async () => {
  const directory = await fixture();
  const { store } = memoryStore();
  const verify = store.verify.bind(store);
  const updates: UploadProgress[] = [];
  store.verify = async (key, size, hash) => {
    if (key.endsWith("/_complete.json")) throw new Error("Completion verification failed");
    await verify(key, size, hash);
  };
  await expect(publishRelease(directory, store, (p) => updates.push(p))).rejects.toThrow(
    "Completion verification failed",
  );
  expect(updates.at(-1)?.phase).toBe("finalizing");
});

test("只重试已占用序号，r999 之后停止且不上传", async () => {
  const content = await validateContent(await fixture(0));
  const { store } = memoryStore();
  const reserve = vi.spyOn(store, "tryReserve").mockResolvedValue(false);
  const put = vi.spyOn(store, "put");
  await expect(publishValidatedContent(content, store, undefined, date)).rejects.toThrow(
    "序号已用尽",
  );
  expect(reserve).toHaveBeenCalledTimes(999);
  expect(reserve.mock.calls.at(-1)?.[0]).toBe(
    `releases/20261117-gtest-f${FORMAT_VERSION}-r999/_upload.json`,
  );
  expect(put).not.toHaveBeenCalled();
});

test("r999 可以发布，UTC 日期或来源版本变化后重新从 r001 开始", async () => {
  const content = await validateContent(await fixture(0));
  const { store } = memoryStore();
  const reserve = vi.spyOn(store, "tryReserve");
  for (let sequence = 1; sequence < 999; sequence++) reserve.mockResolvedValueOnce(false);
  expect((await publishValidatedContent(content, store, undefined, date)).release).toBe(
    `20261117-gtest-f${FORMAT_VERSION}-r999`,
  );
  expect(
    (await publishValidatedContent(content, store, undefined, new Date("2026-11-18T00:00:00Z")))
      .release,
  ).toBe(`20261118-gtest-f${FORMAT_VERSION}-r001`);
  content.release.manifest.source.gameVersion = "new";
  expect((await publishValidatedContent(content, store, undefined, date)).release).toBe(
    `20261117-gnew-f${FORMAT_VERSION}-r001`,
  );
});

test("不合法的来源版本在预留前失败", async () => {
  const content = await validateContent(await fixture(0));
  content.release.manifest.source.gameVersion = "../unsafe";
  const { store } = memoryStore();
  const reserve = vi.spyOn(store, "tryReserve");
  await expect(publishValidatedContent(content, store, undefined, date)).rejects.toThrow();
  expect(reserve).not.toHaveBeenCalled();
});

test("图片在验证后发生变化会停止上传并保留占号", async () => {
  const directory = await fixture();
  const content = await validateContent(directory);
  await writeFile(path.join(directory, imageKey), "changed");
  const { store, objects } = memoryStore();
  await expect(publishValidatedContent(content, store, undefined, date)).rejects.toMatchObject({
    release: firstId,
    phase: "upload",
    message: expect.stringContaining("Image changed"),
  });
  expect([...objects.keys()]).toEqual([`releases/${firstId}/_upload.json`]);
});
