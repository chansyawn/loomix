import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "vite-plus/test";
import { vignette } from "../../../../packages/schema/tests/fixture.ts";
import { loadWebsiteResources } from "@loomix/resources/website-resources";
import { assemble } from "../extraction/assemble/index.ts";
import { freezeFlowerFixture } from "../extraction/fixtures/flower-hybridization.ts";
import { readCandidate, writeAssembly } from "../extraction/bundle.ts";
import { clientReadRecordsFixture } from "../extraction/fixtures/client-read-records.ts";
import { CLIENT_READ_RECORDS_FILE } from "../extraction/files.ts";
import { objectIdentity } from "../extraction/images/model.ts";
import { digest, inventory } from "../workflow/hashing.ts";
import { writeJson } from "../workflow/json.ts";
import { renderImages } from "./images.ts";
import { validatePackageWebsite } from "./verify.ts";
import { replaceLocalResources } from "./replace.ts";
import { WEBSITE_RESOURCE_DIRECTORY } from "./files.ts";

test("小栖地及其配图可从提取结果打包、验证并安装", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-vignette-package-"));
  try {
    const directory = path.join(root, "extraction");
    const work = path.join(root, "resource-package");
    const output = path.join(root, "website");
    fs.mkdirSync(path.join(directory, "originals"), { recursive: true });
    const observations = clientReadRecordsFixture();
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
    writeJson(path.join(directory, CLIENT_READ_RECORDS_FILE), observations);
    writeJson(path.join(directory, "originals.json"), originals);
    const flowerHybridization = freezeFlowerFixture(directory, observations.source);
    writeAssembly(directory, assemble(observations, originals, flowerHybridization));
    const bundle = readCandidate(directory);
    expect(bundle.imageJobs).toMatchObject([{ assetId: object, variant: "illustration" }]);

    await renderImages(work, bundle);
    await validatePackageWebsite(work, bundle.dataset);
    const website = path.join(work, WEBSITE_RESOURCE_DIRECTORY);
    await replaceLocalResources(website, output, await inventory(website));
    const resources = await loadWebsiteResources(output);
    expect(resources.dataset).toEqual(bundle.dataset);
    expect(resources.manifest.files).toContainEqual(
      expect.objectContaining({ kind: "vignettes", path: "zh-CN/vignettes.json" }),
    );
    expect(resources.imageIndex.images).toMatchObject([
      { assetId: object, variant: "illustration", width: 12, height: 6 },
    ]);
    fs.appendFileSync(path.join(website, resources.imageIndex.images[0].file), "changed");
    await expect(validatePackageWebsite(work, bundle.dataset)).rejects.toThrow(
      "Image SHA-256 or size mismatch",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
