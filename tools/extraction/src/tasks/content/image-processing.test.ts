import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { emptyContent } from "@loomix/content-schema";
import { processImage, decodeWebp } from "./image-processing.ts";
import { assets } from "./assets.ts";
import { postprocessImages } from "./postprocess-images.ts";
import type { ProcessedImage, SelectedImage } from "./types.ts";

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
    const output = await processImage(png, "clothing.sets");
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
    const output = await processImage(input, "furniture.sets");
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
  await assert.rejects(processImage(Buffer.from("broken"), "miscellaneous"));
  const png = await sharp({ create: { width: 256, height: 256, channels: 4, background: "red" } })
    .png()
    .toBuffer();
  await assert.rejects(decodeWebp(png), /Expected WebP/);
  const output = await processImage(png, "miscellaneous");
  await assert.rejects(decodeWebp(output.bytes.subarray(0, output.bytes.length / 2)));
});

test("asset delivery deduplicates identical outputs and separates target dimensions", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-webp-"));
  try {
    const content = emptyContent();
    const base = { name: "fixture", description: null, quality: 0, image: null };
    content.miscellaneous.push({ ...base, id: 1 }, { ...base, id: 2 });
    content.furniture.sets.push({ ...base, id: 3, seriesName: null, componentIds: null });
    const candidate: SelectedImage = {
      id: 1,
      group: "miscellaneous",
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
      { ...candidate, id: 3, group: "furniture.sets" },
    ];
    fs.mkdirSync(path.join(work, "raw"));
    fs.writeFileSync(path.join(work, "raw/content.json"), JSON.stringify(content));
    fs.writeFileSync(path.join(work, "candidate-images.json"), JSON.stringify(candidates));
    fs.writeFileSync(path.join(work, "field-evidence.json"), "[]");
    const png = await sharp({ create: { width: 512, height: 512, channels: 4, background: "red" } })
      .png()
      .toBuffer();
    await assets({ work }, async (request) => {
      fs.mkdirSync(path.join(request.output, "Texture2D"), { recursive: true });
      fs.writeFileSync(path.join(request.output, "Texture2D/fixture.png"), png);
    });
    fs.mkdirSync(path.join(work, "evidence"));
    fs.copyFileSync(
      path.join(work, "image-field-evidence.json"),
      path.join(work, "evidence/field-evidence.json"),
    );
    await postprocessImages({ work }, work);
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
