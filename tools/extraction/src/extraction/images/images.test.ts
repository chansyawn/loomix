import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "vite-plus/test";
import { PNG } from "pngjs";
import { digest } from "../../workflow/hashing.ts";
import { objectIdentity, uniqueObjects } from "./model.ts";
import type { ImageObject, ImageNeed, OriginalImage } from "./model.ts";
import { bindImages } from "./bind.ts";
import { exportOriginals, imageBatches } from "./originals.ts";
import { imageCollector } from "../source/images.ts";
import type { ImageExporter } from "./anime-studio.ts";

const object = (
  pathId: string,
  source = "package.blk",
  resourceName = `Object${pathId}`,
): ImageObject => ({
  key: objectIdentity(digest(source), "Sprite", pathId),
  packageSha256: digest(source),
  source,
  assetType: "Sprite",
  pathId,
  container: `assets/${pathId}.png`,
  resourceName,
});
const indexOf = (objects: ImageObject[]) =>
  objects.map((entry) => ({
    Name: entry.resourceName,
    Container: entry.container,
    Type: entry.assetType,
    Source: entry.source,
    PathID: entry.pathId,
  }));
const need = (
  id: string,
  objects: ImageObject[],
  variant: ImageNeed["variant"] = "icon",
): ImageNeed => ({
  id,
  owner: { kind: "item", id: 1, field: id },
  references: objects.map((entry) => entry.resourceName),
  candidates: objects.map((entry, rank) => ({
    object: entry.key,
    reference: entry.resourceName,
    rank,
  })),
  variant,
  required: false,
  reason: "unconfigured",
  sources: [],
});
const original = (entry: ImageObject, width = 10): OriginalImage => ({
  object: entry.key,
  file: "original.png",
  sha256: "a".repeat(64),
  width,
  height: width,
});

test("对象身份使用有符号 64 位规范 PathID，并在去重前拒绝矛盾定位", () => {
  for (const pathId of ["01", "-0", "+1", "1.0", "9223372036854775808", "-9223372036854775809"])
    assert.throws(() => object(pathId));
  for (const pathId of ["0", "9223372036854775807", "-9223372036854775808"])
    assert.equal(object(pathId).pathId, pathId);
  const first = object("1");
  assert.throws(() => uniqueObjects([first, { ...first, container: "other" }]), /Conflicting/);
  assert.deepEqual(uniqueObjects([first, { ...first, source: "alias.blk" }]), [
    { ...first, source: "alias.blk" },
  ]);
});

test("用途按像素面积、原始 rank、对象身份选择；同图多变体保留独立任务", () => {
  const first = object("1"),
    second = object("2");
  const uses = [need("item", [first, second]), need("collection", [first], "banner")];
  const images = [original(first), original(second, 20)];
  assert.equal(bindImages(uses, images).image("item")?.assetId, second.key);
  images[0] = original(first, 20);
  assert.equal(bindImages(uses, images).image("item")?.assetId, first.key);
  assert.equal(bindImages(uses, images).jobs.length, 2);
  assert.throws(() => bindImages(uses, [images[0]]), /Missing complete/);
  const missing = need("missing", []);
  missing.required = true;
  assert.throws(() => bindImages([missing], []), /required/);
});

test("导出定位歧义直接失败；未进入用途的同名容器仍强制隔离批次", () => {
  const first = object("1", "package.blk", "Flower");
  const second = object("2", "package.blk", "Flower");
  const index = indexOf([first, second]);
  assert.deepEqual(
    imageBatches([first, second], index),
    [[first], [second]].sort((a, b) => a[0].key.localeCompare(b[0].key)),
  );
  const collector = imageCollector(
    [...index, { ...index[0], PathID: "3" }],
    new Map([[first.source, first.packageSha256]]),
  );
  assert.throws(
    () =>
      collector.need(
        { kind: "item", id: 1, field: "image" },
        [{ ...first, reference: "UISprite/Flower" }],
        "icon",
        [],
        "missing",
      ),
    /cannot uniquely address/,
  );
});

test("跨领域共享对象只导一次，不同对象相同 PNG 仅共享内容存储；中断只补失败批次", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-originals-"));
  try {
    const first = object("1", "first.blk"),
      second = object("2", "second.blk");
    const objects = [first, first, second];
    const png = PNG.sync.write(new PNG({ width: 2, height: 3 }));
    const calls = new Map<string, number>();
    let fail = true;
    const exporter: ImageExporter = async ({ objects, destination }) => {
      const entry = objects[0]!;
      calls.set(entry.key, (calls.get(entry.key) ?? 0) + 1);
      if (entry.key === second.key && fail) throw new Error("Interrupted fixture export");
      const file = path.join(destination, "image.png");
      fs.writeFileSync(file, png);
      return new Map([[entry.key, file]]);
    };
    const options = {
      objects,
      index: indexOf(objects),
      cache: path.join(root, "cache"),
      work: path.join(root, "bundle"),
      resolvePath: (relative: string) => path.join(root, relative),
      tool: "tool-bytes-v1",
      implementation: "implementation-v1",
      exporter,
    };
    await assert.rejects(exportOriginals(options), /Interrupted/);
    fail = false;
    const originals = await exportOriginals(options);
    assert.equal(calls.get(first.key), 1);
    assert.equal(calls.get(second.key), 2);
    assert.equal(originals.length, 2);
    assert.equal(new Set(originals.map((image) => image.file)).size, 1);
    assert.notEqual(originals[0].object, originals[1].object);
    await exportOriginals(options);
    assert.equal(calls.get(first.key), 1);
    await exportOriginals({ ...options, tool: "changed-tool-bytes" });
    assert.equal(calls.get(first.key), 2);
    fs.rmSync(options.cache, { recursive: true });
    for (const image of originals)
      assert.equal(digest(fs.readFileSync(path.join(options.work, image.file))), image.sha256);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("损坏 PNG 和不完整 exporter 回执不能登记原图", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-corrupt-original-"));
  try {
    const first = object("1");
    const options = {
      objects: [first],
      index: indexOf([first]),
      cache: path.join(root, "cache"),
      work: root,
      resolvePath: (relative: string) => path.join(root, relative),
      tool: "tool",
      implementation: "impl",
    };
    await assert.rejects(
      exportOriginals({ ...options, exporter: async () => new Map() }),
      /receipt/,
    );
    await assert.rejects(
      exportOriginals({
        ...options,
        exporter: async ({ destination }) => {
          const file = path.join(destination, "bad.png");
          fs.writeFileSync(file, "broken");
          return new Map([[first.key, file]]);
        },
      }),
    );
    assert.equal(fs.existsSync(path.join(root, "originals")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("配置 rank 保留未匹配大图位置和重复大小图配置的先后顺序", () => {
  const first = object("1");
  const collector = imageCollector(
    indexOf([first]),
    new Map([[first.source, first.packageSha256]]),
  );
  collector.need(
    { kind: "item", id: 1, field: "image" },
    [{ ...first, reference: "small" }],
    "icon",
    [],
    "missing",
    false,
    ["missing-large", "small"],
  );
  collector.need(
    { kind: "item", id: 2, field: "image" },
    [
      { ...first, reference: "same" },
      { ...first, reference: "same" },
    ],
    "icon",
    [],
    "missing",
    false,
    ["same", "same"],
  );
  assert.deepEqual(
    collector.needs.map((need) => need.candidates.map((candidate) => candidate.rank)),
    [[1], [0, 1]],
  );
});
