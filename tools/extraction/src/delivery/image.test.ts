import { datasetFixture, recordMetadata } from "../../../../packages/schema/tests/fixture.ts";
import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { parseAssets } from "@loomix/schema/assets";
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
    const dataset = datasetFixture(
      { formatVersion: 8, snapshotId: "a".repeat(64), locale: "zh-CN" },
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
    const base = {
      ...recordMetadata(),
      acquisition: null,
      name: "fixture",
      quality: null,
      description: null,
    };
    dataset.catalog.records.push(
      { ...base, id: 1, kind: "material", displayCategory: null, trade: null, image: first },
      { ...base, id: 2, kind: "material", displayCategory: null, trade: null, image: second },
    );
    dataset.catalog.records.push({
      ...base,
      id: 3,
      kind: "furniture.set",
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

test("diary and white atlas images are delivered with full references, original size and alpha", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-neighbor-images-"));
  try {
    const dataset = datasetFixture(
      { formatVersion: 8, snapshotId: "a".repeat(64), locale: "zh-CN" },
      { gameVersion: "test", dataRevision: 1, resourceRevision: 1, manifestId: "1" },
    );
    dataset.neighbors.neighbors.push({
      id: 11,
      name: "蛮蛮",
      bodyType: null,
      scaleValue: null,
      avatar: null,
      npc2Path: "Avatar/NPC2/NPC_11",
    });
    const registry = createAssetRegistry();
    const sizes = [
      ["diaryIllustration", 452, 534],
      ["diaryWatermark", 300, 300],
      ["diarySticker", 78, 108],
      ["starAtlasIcon", 83, 89],
    ] as const;
    for (const [category, width, height] of sizes) {
      const png = await sharp({
        create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .composite([
          {
            input: await sharp({
              create: { width: width - 8, height: height - 8, channels: 4, background: "white" },
            })
              .png()
              .toBuffer(),
            left: 4,
            top: 4,
          },
        ])
        .png()
        .toBuffer();
      const file = `${category}.png`;
      fs.writeFileSync(path.join(work, file), png);
      const image = registry.register({
        file,
        sha256: digest(png),
        width,
        height,
        source: "fixture.blk",
        container: category,
        assetType: "Sprite",
        pathId: category,
      });
      dataset.neighbors.additionalImages.push({ key: category, category, neighborId: 11, image });
    }
    fs.writeFileSync(path.join(work, "dataset.json"), JSON.stringify(dataset));
    fs.writeFileSync(
      path.join(work, "image-jobs.json"),
      JSON.stringify([...registry.jobs.values()]),
    );
    await renderImages({ work }, work);
    const assets = parseAssets(
      JSON.parse(fs.readFileSync(path.join(work, "staging/assets.json"), "utf8")),
    );
    assert.equal(assets.images.length, sizes.length);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(work, "staging/zh-CN/neighbors.json"), "utf8")),
      dataset.neighbors,
    );
    for (const [category, width, height] of sizes) {
      const reference = dataset.neighbors.additionalImages.find(
        (image) => image.category === category,
      )!;
      const delivered = assets.images.find((image) => image.assetId === reference.image.assetId)!;
      assert.equal(delivered.variant, "illustration");
      assert.equal(delivered.width, width);
      assert.equal(delivered.height, height);
      const pixels = await sharp(path.join(work, "staging", delivered.file))
        .ensureAlpha()
        .raw()
        .toBuffer();
      assert.equal(pixels[3], 0);
      const center = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
      for (const channel of [0, 1, 2]) assert.ok(pixels[center + channel]! >= 250);
      assert.equal(pixels[center + 3], 255);
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});
