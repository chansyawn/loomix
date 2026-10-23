import type {
  EvidenceRecord,
  SourceReference,
  TableEvidence,
  TagNode,
  BinDataAsset,
} from "../../tasks/content/types.ts";
import { plainText } from "../../tasks/content/model.ts";
import { Tables } from "../decode/tables.ts";
import { profile } from "../../profile.ts";
import { relatedRows } from "./rows.ts";
import type { EvidenceIndex } from "./rows.ts";
export function evidenceSources(
  proof: EvidenceRecord,
  hints: TableEvidence[],
  tables: Tables,
  tree: Record<string, TagNode>,
  bindata: BinDataAsset[],
  index: EvidenceIndex,
): SourceReference[] {
  const sources: SourceReference[] = [];
  for (const hint of hints) {
    const rows = relatedRows(proof, hint, tables, tree, index);
    for (const row of rows) {
      sources.push({
        file: "prepared/ed.obb",
        table: hint.table,
        row: tables.uint(row, 0, 0),
        rowOffset: row.rowOffset,
        fields:
          hint.table === profile.roots.furnitureTypes
            ? [2, 3, 4, 5]
            : Array.isArray(hint.field)
              ? hint.field
              : [hint.field],
      });
      if (typeof proof.value === "string") {
        for (const index of Array.isArray(hint.field) ? hint.field : [hint.field]) {
          const key = tables.uint(row, index);
          const entry = key === null ? undefined : tables.textmap[key];
          const label = plainText(entry?.nameZh);
          if (key !== null && entry && label && proof.value.includes(label))
            sources.push({
              file: "prepared/ed.obb",
              table: profile.roots.textmap,
              row: key,
              rowOffset: entry.rowOffset,
              fields: [profile.fields.textmap.zh],
            });
        }
      }
    }
  }
  if (!Array.isArray(proof.evidence) && "source" in proof.evidence) {
    sources.push({ file: proof.evidence.source, pathId: proof.evidence.pathId });
  }
  if (proof.field === "effects") {
    const template = tables.textmap[4027993099];
    if (template)
      sources.push({
        file: "prepared/ed.obb",
        table: profile.roots.textmap,
        row: 4027993099,
        rowOffset: template.rowOffset,
        fields: [profile.fields.textmap.zh],
      });
  }
  // Localization and tag/display resolution are separately retained, hash-bound inputs.
  if (typeof proof.value === "string") sources.push({ file: "prepared/textmap-zh-en.json" });
  if (
    [
      "category",
      "colors",
      "materials",
      "styles",
      "originGalaxy",
      "galaxyFlavor",
      "habitat",
      "region",
      "activeSeasons",
      "activeTimes",
      "activeWeather",
    ].includes(proof.field)
  ) {
    for (const asset of bindata) sources.push({ file: asset.file, pathId: asset.PathID });
  }
  if (
    Array.isArray(proof.value) &&
    !proof.value.every((member) => sources.some((source) => source.row === member))
  )
    throw new Error(`Missing explicit member source: ${proof.id}.${proof.field}`);

  return sources;
}
