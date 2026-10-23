import type {
  Evidence,
  EvidenceRecord,
  TableEvidence,
  TagNode,
} from "../../tasks/content/types.ts";
import { expandTags, splitTags } from "../../tasks/content/model.ts";
import { Tables } from "../../extraction/decode/tables.ts";
import { profile } from "../../tasks/content/config.ts";
function tableEvidence(evidence: Evidence): TableEvidence[] {
  if (Array.isArray(evidence))
    return evidence.filter((entry): entry is TableEvidence => typeof entry !== "string");
  return "table" in evidence ? [evidence] : [];
}

export function evidenceHints(proof: EvidenceRecord): TableEvidence[] {
  const hints = tableEvidence(proof.evidence);
  if (proof.field === "difficulty") hints.push({ table: profile.roots.recipeDifficulty, field: 1 });
  if (proof.field === "image" && proof.value !== null)
    hints.push({ table: profile.roots.ui, field: [4, 5], note: "configured image reference" });
  if (proof.field === "componentIds") hints.push({ table: profile.roots.ui, field: 35 });

  return hints;
}
export function relatedRows(
  proof: EvidenceRecord,
  hint: TableEvidence,
  tables: Tables,
  tree: Record<string, TagNode>,
) {
  const ui = tables.rows(profile.roots.ui).find((row) => tables.uint(row, 0, 0) === proof.id);
  const item = tables.rows(profile.roots.items).find((row) => tables.uint(row, 0, 0) === proof.id);
  const recipe = tables.rows(profile.roots.recipes).find((row) => tables.uint(row, 4) === proof.id);

  return tables.rows(hint.table).filter((row) => {
    if (hint.table === profile.roots.crops) return tables.vector(row, 10)?.includes(proof.id);
    if (hint.table === profile.roots.recipes) return tables.uint(row, 4) === proof.id;
    if (hint.table === profile.roots.recipeDifficulty)
      return tables.uint(row, 0, 0) === tables.uint(recipe, 2);
    if (hint.table === profile.roots.cookware)
      return tables.uint(row, 2) === tables.uint(recipe, 16);
    if (hint.table === profile.roots.sources)
      return tables.vector(ui, profile.fields.ui.sources)?.includes(tables.uint(row, 0, 0));
    if (hint.table === profile.roots.qualities)
      return tables.uint(row, 1, 0) === tables.uint(ui, profile.fields.ui.quality, 0);
    if (hint.table === profile.roots.categories) {
      const expanded = expandTags(
        [...splitTags(tables.string(item, 6)), ...splitTags(tables.string(item, 15))],
        tree,
      );
      return splitTags(tables.string(row, 5)).some((tag) => expanded.has(tag));
    }
    if (hint.table === profile.roots.furnitureTypes) {
      const tags = new Set(splitTags(tables.string(item, 6)));
      const matches = (entry: typeof row, field: number) =>
        splitTags(tables.string(entry, field)).some((tag) => tags.has(tag));
      const primary = tables.rows(hint.table).some((entry) => matches(entry, 5));
      return matches(row, primary ? 5 : 3);
    }
    if (["componentIds", "creatureIds", "plantIds", "dishIds"].includes(proof.field))
      return (
        Array.isArray(proof.value) &&
        proof.value.includes(tables.uint(row, 0, 0)) &&
        tables.uint(row, hint.table === profile.roots.ui ? 35 : 9) === proof.id
      );
    return tables.uint(row, 0) === proof.id;
  });
}
