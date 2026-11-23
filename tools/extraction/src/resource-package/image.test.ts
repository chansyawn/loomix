import {
  collection,
  datasetFixture,
  material,
  neighbor,
} from "../../../../packages/schema/tests/fixture.ts";
import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { parseImageIndex } from "@loomix/schema/assets";
import { documentPath } from "@loomix/schema/website-resources";
import { imageKey, type ImageRef } from "@loomix/schema/assets";
import { readJson } from "../workflow/json.ts";
import { parseDataset } from "@loomix/schema/dataset";
import type { ImageJob } from "../extraction/images/model.ts";
import { digest } from "../workflow/hashing.ts";
import { processImage, processNeighborImage, decodeWebp } from "./image.ts";
import { renderImages } from "./images.ts";
import { IMAGE_PROCESSING_REPORT_FILE, WEBSITE_RESOURCE_DIRECTORY } from "./files.ts";

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
    const output = await processImage(png, "icon");
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

test("创想卡底图保留原始比例、尺寸和透明度", async () => {
  for (const [width, height] of [
    [390, 560],
    [212, 252],
  ]) {
    const png = await sharp({
      create: { width, height, channels: 4, background: { r: 20, g: 80, b: 150, alpha: 0.5 } },
    })
      .png()
      .toBuffer();
    const output = await processImage(png, "card-background");
    const { data, info } = await sharp(output.bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual([output.width, output.height], [width, height]);
    assert.deepEqual([info.width, info.height], [width, height]);
    assert.equal(data[3], 128);
  }
});

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
    const output = await processImage(input, "banner");
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
  await assert.rejects(processImage(Buffer.from("broken"), "icon"));
  const png = await sharp({ create: { width: 256, height: 256, channels: 4, background: "red" } })
    .png()
    .toBuffer();
  await assert.rejects(decodeWebp(png), /Expected WebP/);
  const output = await processImage(png, "icon");
  await assert.rejects(decodeWebp(output.bytes.subarray(0, output.bytes.length / 2)));
});

test("website image files deduplicate identical outputs and separate target dimensions", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-webp-"));
  try {
    const dataset = datasetFixture();
    const png = await sharp({ create: { width: 512, height: 512, channels: 4, background: "red" } })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(work, "original.png"), png);
    const jobs = new Map<string, ImageJob>();
    const register = (
      original: Omit<ImageJob["original"], "object"> & { pathId: string },
      variant: ImageRef["variant"] = "illustration",
    ): ImageRef => {
      const image = { assetId: digest(original.pathId), variant };
      jobs.set(imageKey(image), { ...image, original: { ...original, object: image.assetId } });
      return image;
    };
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
    const first = register(original, "icon");
    const second = register({ ...original, pathId: "2" }, "icon");
    const banner = register(original, "banner");
    dataset.catalog.items.push({ ...material(1), image: first }, { ...material(2), image: second });
    dataset.catalog.collections.push({ ...collection(3, "furniture", null), image: banner });
    fs.writeFileSync(path.join(work, "dataset.json"), JSON.stringify(dataset));
    fs.writeFileSync(path.join(work, "image-jobs.json"), JSON.stringify([...jobs.values()]));
    await renderImages(work, {
      directory: work,
      dataset: parseDataset(readJson(path.join(work, "dataset.json"))),
      imageJobs: readJson<ImageJob[]>(path.join(work, "image-jobs.json")),
    });
    const report: (ImageJob & { websiteImageFile: { file: string; width: number } })[] = JSON.parse(
      fs.readFileSync(path.join(work, IMAGE_PROCESSING_REPORT_FILE), "utf8"),
    );
    assert.equal(report.length, 3);
    assert.equal(report[0].websiteImageFile.file, report[1].websiteImageFile.file);
    assert.notEqual(report[0].websiteImageFile.file, report[2].websiteImageFile.file);
    assert.equal(report[2].websiteImageFile.width, 1024);
    const website = path.join(work, WEBSITE_RESOURCE_DIRECTORY);
    assert.equal(fs.readdirSync(path.join(website, "assets")).length, 2);
    assert.deepEqual(
      readJson(path.join(website, documentPath("catalog", dataset.context.locale))),
      dataset.catalog,
    );
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
});

test("resource packaging rejects an invalid dataset before converting images", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-invalid-dataset-"));
  try {
    fs.writeFileSync(path.join(work, "dataset.json"), "{}");
    await assert.rejects(
      async () =>
        renderImages(work, {
          directory: work,
          dataset: parseDataset(readJson(path.join(work, "dataset.json"))),
          imageJobs: [],
        }),
      { name: "ZodError" },
    );
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

test("website neighbor illustrations retain references, original size and alpha", async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-neighbor-images-"));
  try {
    const dataset = datasetFixture();
    const owner = neighbor(11);
    dataset.neighbors.neighbors.push(owner);
    const jobs = new Map<string, ImageJob>();
    const register = (
      original: Omit<ImageJob["original"], "object"> & { pathId: string },
      variant: ImageRef["variant"] = "illustration",
    ): ImageRef => {
      const image = { assetId: digest(original.pathId), variant };
      jobs.set(imageKey(image), { ...image, original: { ...original, object: image.assetId } });
      return image;
    };
    const sizes = [
      ["favour", 452, 534],
      ["role", 300, 300],
    ] as const;
    const images = new Map<string, ImageRef>();
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
      const image = register({
        file,
        sha256: digest(png),
        width,
        height,
        pathId: category,
      });
      images.set(category, image);
      owner.images[category] = image;
    }
    fs.writeFileSync(path.join(work, "dataset.json"), JSON.stringify(dataset));
    fs.writeFileSync(path.join(work, "image-jobs.json"), JSON.stringify([...jobs.values()]));
    await renderImages(work, {
      directory: work,
      dataset: parseDataset(readJson(path.join(work, "dataset.json"))),
      imageJobs: readJson<ImageJob[]>(path.join(work, "image-jobs.json")),
    });
    const website = path.join(work, WEBSITE_RESOURCE_DIRECTORY);
    const imageIndex = parseImageIndex(
      readJson(path.join(website, documentPath("image-index", dataset.context.locale))),
    );
    assert.equal(imageIndex.images.length, sizes.length);
    assert.deepEqual(
      readJson(path.join(website, documentPath("neighbors", dataset.context.locale))),
      dataset.neighbors,
    );
    for (const [category, width, height] of sizes) {
      const reference = images.get(category)!;
      const websiteImageFile = imageIndex.images.find(
        (image) => image.assetId === reference.assetId,
      )!;
      assert.equal(websiteImageFile.variant, "illustration");
      assert.equal(websiteImageFile.width, width);
      assert.equal(websiteImageFile.height, height);
      const pixels = await sharp(path.join(website, websiteImageFile.file))
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
