import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { emptyDataset } from "@loomix/schema/dataset";
import { createAssetRegistry } from "../domains/assets.ts";
import type { ImageJob } from "../domains/assets.ts";
import { digest } from "../workflow/hashing.ts";
import { processImage, processNeighborImage, decodeWebp } from "./image.ts";
import { renderImages } from "./images.ts";

for (const size of [256, 512]) {
  test(`converts ${size}px icons to 256px WebP and preserves alpha`, async () => {
    const png = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 20, g: 80, b: 150, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    const output = await processImage(png, "clothing.set");
    assert.equal(output.width, 256);
    assert.equal(output.height, 256);
    await decodeWebp(output.bytes);
    const { data, info } = await sharp(output.bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 4);
    assert.equal(data[3], 128);
  });
}

test("furniture banners resize and crop centrally without distortion", async () => {
  for (const [width, height] of [
    [1024, 512],
    [2037, 1019],
    [2048, 1095],
  ]) {
    const input = await sharp({ create: { width, height, channels: 4, background: "red" } })
      .composite([
        {
          input: await sharp({
            create: { width, height: Math.floor(height / 2), channels: 4, background: "blue" },
          })
            .png()
            .toBuffer(),
          gravity: "centre",
        },
      ])
      .png()
      .toBuffer();
    const output = await processImage(input, "furniture.set");
    const pixels = await sharp(output.bytes).ensureAlpha().raw().toBuffer();
    for (const y of [100, 450]) assert.ok(pixels[(y * 1024 + 512) * 4] > 240, "Red outer bands");
    for (const y of [150, 350])
      assert.ok(pixels[(y * 1024 + 512) * 4 + 2] > 240, "Blue central band");
    const decoded = await decodeWebp(output.bytes);
    assert.equal(decoded.width, 1024);
    assert.equal(decoded.height, 512);
  }
});

test("corrupt inputs and truncated WebP fail decoding", async () => {
  await assert.rejects(processImage(Buffer.from("broken"), "miscellaneous.item"));
  const png = await sharp({ create: { width: 256, height: 256, channels: 4, background: "red" } })
    .png()
    .toBuffer();
  await assert.rejects(decodeWebp(png), /Expected WebP/);
  const output = await processImage(png, "miscellaneous.item");
  await assert.rejects(decodeWebp(output.bytes.subarray(0, output.bytes.length / 2)));
});

test("asset delivery deduplicates identical outputs and separates target dimensions", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-webp-"));
  try {
    const dataset = emptyDataset(
      { formatVersion: 1, snapshotId: "a".repeat(64), locale: "zh-CN" },
      { gameVersion: "test", dataRevision: 1, resourceRevision: 1, manifestId: "1" },
    );
    const png = await sharp({ create: { width: 512, height: 512, channels: 4, background: "red" } })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(work, "original.png"), png);
    const registry = createAssetRegistry();
    const original = {
      file: "original.png",
      sha256: digest(png),
      width: 512,
      height: 512,
      source: "source.blk",
      container: "fixture",
      assetType: "Sprite",
      pathId: "1",
    };
    const first = registry.register(original, "miscellaneous.item");
    const second = registry.register({ ...original, pathId: "2" }, "miscellaneous.item");
    const banner = registry.register(original, "furniture.set");
    const base = { name: "fixture", quality: null, description: null };
    dataset.catalog.items.push(
      { ...base, id: 1, type: "reference", image: first },
      { ...base, id: 2, type: "reference", image: second },
    );
    dataset.catalog.groups.push({
      ...base,
      id: 3,
      type: "furniture.set",
      image: banner,
      memberIds: null,
    });
    fs.writeFileSync(path.join(work, "dataset.json"), JSON.stringify(dataset));
    fs.writeFileSync(
      path.join(work, "image-jobs.json"),
      JSON.stringify([...registry.jobs.values()]),
    );
    await renderImages({ work }, work);
    const manifest: (ImageJob & { delivered: { file: string; width: number } })[] = JSON.parse(
      fs.readFileSync(path.join(work, "image-manifest.json"), "utf8"),
    );
    assert.equal(manifest.length, 3);
    assert.equal(manifest[0].delivered.file, manifest[1].delivered.file);
    assert.notEqual(manifest[0].delivered.file, manifest[2].delivered.file);
    assert.equal(manifest[2].delivered.width, 1024);
    assert.equal(fs.readdirSync(path.join(work, "staging/assets")).length, 2);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(work, "staging/zh-CN/catalog.json"), "utf8")),
      dataset.catalog,
    );
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});

test("delivery rejects invalid domain data before converting images", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-invalid-dataset-"));
  try {
    fs.writeFileSync(path.join(work, "dataset.json"), "{}");
    await assert.rejects(renderImages({ work }, work), { name: "ZodError" });
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});

test("neighbor images retain full framing and alpha, never upscale and fit within 1600px", async () => {
  for (const [width, height, targetWidth, targetHeight] of [
    [80, 40, 80, 40],
    [2400, 1200, 1600, 800],
    [800, 2400, 533, 1600],
  ]) {
    const input = await sharp({
      create: { width, height, channels: 4, background: { r: 20, g: 80, b: 150, alpha: 0.5 } },
    })
      .png()
      .toBuffer();
    const output = await processNeighborImage(input);
    assert.equal(output.width, targetWidth);
    assert.equal(output.height, targetHeight);
    const pixels = await sharp(output.bytes).ensureAlpha().raw().toBuffer();
    assert.equal(pixels[3], 128);
  }
});
