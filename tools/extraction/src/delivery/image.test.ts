import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { emptyCatalog } from "@loomix/content-schema";
import { processImage, processNeighborImage, decodeWebp } from "./image.ts";
import { exportImages } from "../extraction/images/export.ts";
import { renderImages } from "./images.ts";
import type { ProcessedImage, SelectedImage } from "../extraction/types.ts";

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
    const content = emptyCatalog({
      gameVersion: "0.95.2",
      dataRevision: 1449213,
      resourceRevision: 1391927,
    });
    const base = { name: "fixture", description: null, quality: 0 as const, image: null };
    content.items.push(
      {
        category: "miscellaneous",
        kind: "item",
        subcategory: null,
        attributes: {},
        encyclopediaEntry: null,
        ...base,
        id: 1,
      },
      {
        ...base,
        id: 2,
        category: "miscellaneous",
        kind: "item",
        subcategory: null,
        attributes: {},
        encyclopediaEntry: null,
      },
    );
    content.items.push({
      category: "furniture",
      kind: "set",
      encyclopediaEntry: { listed: true },
      ...base,
      id: 3,
      memberIds: null,
    });
    const candidate: SelectedImage = {
      id: 1,
      group: "miscellaneous.item",
      source: "fixture.blk",
      assetType: "Texture2D",
      pathId: "1",
      resourceName: "fixture",
      container: "fixture.png",
      reference: "fixture",
    };
    const candidates = [
      candidate,
      { ...candidate, id: 2 },
      { ...candidate, id: 3, group: "furniture.set" },
    ];
    fs.mkdirSync(path.join(work, "raw"));
    fs.writeFileSync(path.join(work, "raw/content.json"), JSON.stringify(content));
    fs.writeFileSync(
      path.join(work, "raw/neighbors.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          source: { ...content.source, manifestId: "1" },
          neighbors: [],
          stars: [],
          stories: [],
          travelReactions: [],
          encounterIslands: [],
          friendshipRules: [],
          eventTags: [],
          furnishingThemes: [],
          rewards: [],
          assets: [],
        },
        null,
        2,
      ) + "\n",
    );
    fs.writeFileSync(path.join(work, "candidate-images.json"), JSON.stringify(candidates));
    fs.writeFileSync(path.join(work, "field-evidence.json"), "[]");
    const png = await sharp({ create: { width: 512, height: 512, channels: 4, background: "red" } })
      .png()
      .toBuffer();
    await exportImages({ work }, async (request) => {
      fs.mkdirSync(path.join(request.output, "Texture2D"), { recursive: true });
      fs.writeFileSync(path.join(request.output, "Texture2D/fixture.png"), png);
    });
    fs.mkdirSync(path.join(work, "evidence"));
    fs.copyFileSync(
      path.join(work, "image-field-evidence.json"),
      path.join(work, "evidence/field-evidence.json"),
    );
    fs.writeFileSync(path.join(work, "neighbor-image-exports.json"), "[]");
    fs.writeFileSync(path.join(work, "neighbor-additional-image-exports.json"), "[]");
    await renderImages({ work }, work);
    assert.deepEqual(
      fs.readFileSync(path.join(work, "staging/neighbors.json")),
      fs.readFileSync(path.join(work, "raw/neighbors.json")),
    );
    const manifest: ProcessedImage[] = JSON.parse(
      fs.readFileSync(path.join(work, "image-manifest.json"), "utf8"),
    );
    assert.equal(manifest.length, 3);
    assert.equal(manifest[0].file, manifest[1].file);
    assert.notEqual(manifest[0].file, manifest[2].file);
    assert.equal(manifest[0].original.width, 512);
    assert.equal(manifest[2].width, 1024);
    assert.equal(fs.readdirSync(path.join(work, "staging/assets")).length, 2);
    for (const row of manifest) {
      const bytes = fs.readFileSync(path.join(work, "staging", row.file));
      assert.equal(
        row.file,
        `assets/${crypto.createHash("sha256").update(bytes).digest("hex")}.webp`,
      );
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});

test("delivery rejects invalid neighbor JSON before converting images", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-neighbor-delivery-"));
  try {
    fs.mkdirSync(path.join(work, "raw"));
    fs.writeFileSync(path.join(work, "selected-images.json"), "[]");
    fs.writeFileSync(path.join(work, "image-candidates.json"), "[]");
    fs.writeFileSync(
      path.join(work, "raw/content.json"),
      JSON.stringify(
        emptyCatalog({ gameVersion: "fixture", dataRevision: 1, resourceRevision: 1 }),
      ),
    );
    fs.writeFileSync(
      path.join(work, "raw/neighbors.json"),
      JSON.stringify({ schemaVersion: 1, root: 41 }),
    );
    await assert.rejects(renderImages({ work }, work), { name: "ZodError" });
  } finally {
    fs.rmSync(work, { recursive: true });
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
