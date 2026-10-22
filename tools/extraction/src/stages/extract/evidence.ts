import path from "node:path";
import fs from "node:fs";
import type { EvidenceRecord, BinDataAsset } from "../../tasks/content/types.ts";
import { readJson, writeJson } from "../../tasks/content/io.ts";
import { fieldEvidenceSchema } from "../../tasks/content/schemas/evidence.ts";
import { parseBinData } from "../../tasks/content/bindata.ts";
import { Tables } from "../../tasks/content/table-reader.ts";
import { profile } from "../../tasks/content/config.ts";
import { associationRule, transformationRule } from "./evidence-rules.ts";
import { evidenceHints } from "./evidence-rows.ts";
import { evidenceSources } from "./evidence-sources.ts";

export function finalizeEvidence(work: string): void {
  const tables = new Tables(path.join(work, "prepared"));
  const bindata = readJson<BinDataAsset[]>(path.join(work, "bindata-manifest.json"));
  const bin = (name: string) =>
    readJson(bindata.find((asset) => asset.Name === name)?.file ?? "missing-bindata");
  const { tree } = parseBinData(
    bin(profile.binData.tags),
    bin(profile.binData.tagDisplay),
    bin(profile.binData.creatureDisplay),
  );
  const enrich = (proof: EvidenceRecord) => {
    const hints = evidenceHints(proof);
    return fieldEvidenceSchema.parse({
      ...proof,
      sources: evidenceSources(proof, hints, tables, tree, bindata),
      association:
        hints.map((hint) => associationRule(proof.field, hint)).join("; ") ||
        "325 image configuration → exact resource Container/name; Persistent overlay; selected by native pixel count",
      transformation: transformationRule(proof.field),
      status: proof.value === null ? "unconfirmed" : "confirmed",
    });
  };
  const records = readJson<EvidenceRecord[]>(path.join(work, "image-field-evidence.json")).map(
    enrich,
  );
  const missing = readJson<EvidenceRecord[]>(path.join(work, "missing-fields.json")).map(enrich);
  const evidence = path.join(work, "evidence");
  fs.mkdirSync(evidence, { recursive: true });
  writeJson(path.join(evidence, "field-evidence.json"), records);
  writeJson(path.join(evidence, "missing-fields.json"), missing);
  for (const name of [
    "field-candidates",
    "outside-members",
    "image-candidates",
    "selected-images",
    "image-manifest",
    "source-audit",
  ])
    fs.copyFileSync(path.join(work, `${name}.json`), path.join(evidence, `${name}.json`));
}
