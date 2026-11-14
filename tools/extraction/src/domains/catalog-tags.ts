import type { CatalogRecord } from "@loomix/schema/catalog";
import type { ContentContext } from "../extraction/content/context.ts";

export function createRecordMetadata(context: ContentContext) {
  const { tables, vocabulary, gameplayTags } = context;
  return (id: number, seed = false, extraReason?: "neighborClothing") => {
    const row = context.main.get(id);
    const clientType = tables.uint(row, 2);
    if (!row || clientType === null) throw new Error(`Missing main item/type ${id}`);
    const admissionReasons: CatalogRecord["admissionReasons"] = [];
    if (context.scope.encyclopedia.has(id)) admissionReasons.push("encyclopedia");
    if (context.scope.manual.has(id)) admissionReasons.push("manual");
    if (seed) admissionReasons.push("deterministicSeed");
    if (extraReason) admissionReasons.push(extraReason);
    if (!admissionReasons.length) throw new Error(`Item is outside admission scope ${id}`);
    const tagIds = [
      ...new Set(
        Array.from({ length: 10 }, (_, offset) => offset + 6).flatMap((field) =>
          vocabulary.tags(row, field).map((name) => {
            const tag = gameplayTags.index.findByName(name);
            if (!tag) throw new Error(`Unknown GameplayTag ${id}.${field}: ${name}`);
            return tag.id;
          }),
        ),
      ),
    ];
    return { admissionReasons, clientType, clientSecondaryType: tables.uint(row, 3), tagIds };
  };
}
