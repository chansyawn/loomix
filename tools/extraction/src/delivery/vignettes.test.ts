import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "vite-plus/test";
import { vignette } from "../../../../packages/schema/tests/fixture.ts";
import { loadReleaseDirectory } from "@loomix/resources/delivery";
import { assemble } from "../extraction/assemble/index.ts";
import { readCandidate, writeAssembly } from "../extraction/bundle.ts";
import { observationFixture } from "../extraction/fixtures/observations.ts";
import { objectIdentity } from "../extraction/images/model.ts";
import { digest } from "../workflow/hashing.ts";
import { writeJson } from "../workflow/json.ts";
import { renderImages } from "./images.ts";
import { verifyDelivery } from "./verify.ts";
import { publish } from "./publish.ts";

test("小栖地及其配图可从提取快照交付、验证并落地", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-vignette-delivery-"));
  try {
    const directory = path.join(root, "extraction");
    const work = path.join(root, "delivery");
    const output = path.join(root, "website");
    fs.mkdirSync(path.join(directory, "originals"), { recursive: true });
    const observations = observationFixture();
    const template = vignette();
    const use = `vignette:${template.id}:illustration`;
    const packageSha256 = "a".repeat(64);
    const object = objectIdentity(packageSha256, "Sprite", "1");
    const png = await sharp({ create: { width: 12, height: 6, channels: 4, background: "green" } })
      .png()
      .toBuffer();
    const sha256 = digest(png);
    const file = `originals/${sha256}.png`;
    const originals = [{ object, file, sha256, width: 12, height: 6 }];
    fs.writeFileSync(path.join(directory, file), png);
    observations.vignettes.candidates.push({ id: 2, name: { zh: "花株", en: "Flower" } });
    observations.vignettes.templates.push({ ...template, illustration: { use } });
    observations.imageObjects.push({
      key: object,
      packageSha256,
      source: "fixture.blk",
      assetType: "Sprite",
      pathId: "1",
      container: "vignette/flowerbed",
      resourceName: "Flowerbed",
    });
    observations.imageNeeds.push({
      id: use,
      owner: { kind: "vignette", id: template.id, field: "illustration" },
      variant: "illustration",
      required: true,
      reason: "unconfigured",
      sources: [],
      references: ["vignette/flowerbed"],
      candidates: [{ object, reference: "vignette/flowerbed", rank: 0 }],
    });
    writeJson(path.join(directory, "observations.json"), observations);
    writeJson(path.join(directory, "originals.json"), originals);
    writeAssembly(directory, assemble(observations, originals));
    const bundle = readCandidate(directory);
    expect(bundle.imageJobs).toMatchObject([{ assetId: object, variant: "illustration" }]);

    await renderImages({ work }, bundle);
    await verifyDelivery(work, directory);
    await publish({ work, output });
    const release = await loadReleaseDirectory(output);
    expect(release.dataset).toEqual(bundle.dataset);
    expect(release.manifest.files).toContainEqual(
      expect.objectContaining({ kind: "vignettes", path: "zh-CN/vignettes.json" }),
    );
    expect(release.assets.images).toMatchObject([
      { assetId: object, variant: "illustration", width: 12, height: 6 },
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
