import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PNG } from "pngjs";
import { profile, repoRoot } from "./config.mjs";
import { readJson, writeJson, runProcess, removeWithin } from "./io.mjs";
import { groupAt } from "./model.mjs";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function imageBatches(selected) {
  const unique = new Map(selected.map((a) => [`${a.source}|${a.assetType}|${a.pathId}`, a]));
  const byPackage = new Map();
  for (const a of unique.values()) {
    const key = `${a.source}|${a.assetType}`;
    if (!byPackage.has(key)) byPackage.set(key, []);
    byPackage.get(key).push(a);
  }
  const batches = [];
  for (const assets of byPackage.values()) {
    const counts = new Map();
    for (const a of assets) counts.set(a.resourceName, (counts.get(a.resourceName) ?? 0) + 1);
    const normal = assets.filter((a) => counts.get(a.resourceName) === 1);
    if (normal.length) batches.push(normal);
    // 同名素材需分开导出，因为 AnimeStudio 导出的文件名不包含容器信息。
    for (const a of assets.filter((a) => counts.get(a.resourceName) > 1)) batches.push([a]);
  }
  return batches;
}

export async function assets(options) {
  const selected = readJson(path.join(options.work, "selected-images.json"));
  const batches = imageBatches(selected),
    manifest = [];
  const staging = path.join(options.work, "staging"),
    destination = path.join(staging, "assets");
  const content = readJson(path.join(staging, "content.json"));
  removeWithin(destination, staging);
  fs.mkdirSync(destination, { recursive: true });
  const byAsset = new Map();
  let done = 0;
  for (const batch of batches) {
    const key = crypto
      .createHash("sha256")
      .update(JSON.stringify(batch))
      .digest("hex")
      .slice(0, 24);
    const exported = path.join(options.work, "exports", key),
      { source, assetType } = batch[0];
    removeWithin(exported, options.work);
    await runProcess(
      path.resolve(repoRoot, profile.paths.animeStudio),
      [
        source,
        exported,
        "--game",
        profile.animeGame,
        "--types",
        assetType,
        "--names",
        `^(?:${[...new Set(batch.map((a) => a.resourceName))].map(escapeRegex).join("|")})$`,
        "--containers",
        `^(?:${[...new Set(batch.map((a) => a.container))].map(escapeRegex).join("|")})$`,
      ],
      path.join(options.work, "logs", `assets-${key}.log`),
    );
    for (const a of batch) {
      const file = path.join(exported, assetType, `${a.resourceName}.png`);
      if (!fs.existsSync(file)) throw new Error(`Selected image was not exported: ${a.reference}`);
      const bytes = fs.readFileSync(file),
        png = PNG.sync.read(bytes, { checkCRC: true });
      if (!png.width || !png.height || png.data.length !== png.width * png.height * 4)
        throw new Error(`Invalid complete PNG: ${a.reference}`);
      const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
      const image = `assets/${sha256}.png`;
      fs.writeFileSync(path.join(staging, image), bytes);
      const record = { ...a, file: image, sha256, width: png.width, height: png.height };
      manifest.push(record);
      byAsset.set(`${a.source}|${a.assetType}|${a.pathId}`, image);
    }
    done++;
    if (done % 5 === 0 || done === batches.length)
      console.log(`  Image batches ${done}/${batches.length}`);
    writeJson(path.join(options.work, "image-manifest.json"), manifest);
  }
  const evidence = readJson(path.join(options.work, "field-evidence.json")).filter(
    (p) => p.field !== "image",
  );
  for (const a of selected) {
    const record = groupAt(content, a.group).find((r) => r.id === a.id);
    const image = byAsset.get(`${a.source}|${a.assetType}|${a.pathId}`);
    if (!record || !image) throw new Error(`No exported image for ${a.id}`);
    record.image = image;
    evidence.push({
      id: a.id,
      group: a.group,
      field: "image",
      value: image,
      evidence: {
        reference: a.reference,
        container: a.container,
        source: a.source,
        pathId: a.pathId,
      },
    });
  }
  writeJson(path.join(options.work, "field-evidence.json"), evidence);
  writeJson(path.join(staging, "content.json"), content);
  console.log(
    `Exported ${manifest.length} indexed assets, ${fs.readdirSync(destination).length} unique PNGs`,
  );
}
