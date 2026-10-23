import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Content } from "@loomix/content-schema";
import type {
  WorkOptions,
  SelectedImage,
  ImageManifest,
  ProcessedImage,
  EvidenceRecord,
} from "../extraction/types.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { processImage, imageDimensions } from "./image.ts";
import { groupAt } from "@loomix/content-schema";
import { assetKey } from "../extraction/images/select.ts";
export async function renderImages(options: WorkOptions, extraction: string) {
  const selected = readJson<SelectedImage[]>(path.join(extraction, "selected-images.json"));
  const manifest = readJson<ImageManifest[]>(path.join(extraction, "image-candidates.json"));
  const content = readJson<Content>(path.join(extraction, "raw/content.json"));
  const staging = path.join(options.work, "staging");
  fs.mkdirSync(path.join(staging, "assets"), { recursive: true });
  const selectedManifest: ProcessedImage[] = [];
  const processed = new Map<
    string,
    Awaited<ReturnType<typeof processImage>> & { file: string; sha256: string }
  >();
  for (const a of selected) {
    const original = manifest.find((entry) => assetKey(entry) === assetKey(a))!;
    const originalFile = path.isAbsolute(original.file)
      ? original.file
      : path.join(extraction, original.file);
    const { width, height } = imageDimensions(a.group);
    const key = `${original.sha256}|${width}x${height}`;
    let result = processed.get(key);
    if (!result) {
      const image = await processImage(fs.readFileSync(originalFile), a.group);
      const sha256 = crypto.createHash("sha256").update(image.bytes).digest("hex");
      const file = `assets/${sha256}.webp`;
      fs.writeFileSync(path.join(staging, file), image.bytes);
      result = { ...image, file, sha256 };
      processed.set(key, result);
    }
    selectedManifest.push({
      ...a,
      file: result.file,
      sha256: result.sha256,
      width,
      height,
      original: {
        file: original.file,
        sha256: original.sha256,
        width: original.width,
        height: original.height,
      },
    });
  }
  for (const image of selectedManifest) {
    const record = groupAt(content, image.group).find((record) => record.id === image.id);
    if (!record) throw new Error(`Missing image record ${image.id}`);
    record.image = image.file;
  }
  const evidence = readJson<EvidenceRecord[]>(
    path.join(extraction, "evidence/field-evidence.json"),
  );
  for (const proof of evidence.filter((proof) => proof.field === "image")) {
    proof.value = selectedManifest.find((image) => image.id === proof.id)?.file ?? null;
    proof.transformation =
      "Lanczos3 cover/centre; WebP quality 85, alphaQuality 100; final byte SHA256";
  }
  writeJson(path.join(options.work, "field-evidence.json"), evidence);
  writeJson(path.join(staging, "content.json"), content);
  writeJson(path.join(options.work, "image-manifest.json"), selectedManifest);
}
