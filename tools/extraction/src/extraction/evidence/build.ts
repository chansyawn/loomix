import path from "node:path";
import fs from "node:fs";
import type { EvidenceRecord, BinDataAsset } from "../types.ts";
import { readJson, writeJson } from "../../workflow/json.ts";
import { fieldEvidenceSchema } from "./schema.ts";
import { parseBinData } from "../decode/bindata.ts";
import { Tables } from "../decode/tables.ts";
import { profile } from "../../profile.ts";
import { associationRule, transformationRule } from "./rules.ts";
import { createEvidenceIndex, evidenceHints } from "./rows.ts";
import { evidenceSources } from "./sources.ts";

export function finalizeEvidence(work: string): void {
  const tables = new Tables(path.join(work, "prepared"));
  const bindata = readJson<BinDataAsset[]>(path.join(work, "bindata-manifest.json"));
  const bin = (name: string) => {
    const file = bindata.find((asset) => asset.Name === name)?.file ?? "missing-bindata";
    return readJson(path.isAbsolute(file) ? file : path.join(work, file));
  };
  const { tree } = parseBinData(
    bin(profile.binData.tags),
    bin(profile.binData.tagDisplay),
    bin(profile.binData.creatureDisplay),
  );
  const index = createEvidenceIndex(tables);
  const enrich = (proof: EvidenceRecord) => {
    const hints = evidenceHints(proof);
    return fieldEvidenceSchema.parse({
      ...proof,
      sources: evidenceSources(proof, hints, tables, tree, bindata, index),
      association:
        (!Array.isArray(proof.evidence) && "kind" in proof.evidence
          ? "version-bound manual admission; ID and expected name checked against 318"
          : "") ||
        hints.map((hint) => associationRule(proof.field, hint)).join("; ") ||
        "325 image configuration → exact resource Container/name; Persistent overlay; selected by native pixel count",
      transformation: transformationRule(proof.field),
      status: proof.status ?? (proof.value === null ? "unconfirmed" : "confirmed"),
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
    "record-evidence",
    "collection-evidence",
    "collection-investigation",
    "collection-missing-fields",
    "crafting-audit",
    "seed-image-candidates",
    "seed-image-originals",
    "seed-image-manifest",
    "stage-image-candidates",
    "stage-image-originals",
    "stage-image-manifest",
    "field-candidates",
    "outside-members",
    "image-candidates",
    "selected-images",
    "image-manifest",
    "source-audit",
    "cooking-audit",
    "cooking-evidence",
    "cooking-investigation",
    "neighbor-audit",
    "neighbor-exclusions",
    "neighbor-image-exports",
    "neighbor-image-audit",
  ])
    fs.copyFileSync(path.join(work, `${name}.json`), path.join(evidence, `${name}.json`));
}
