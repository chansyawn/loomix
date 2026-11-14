import type { CatalogRecord } from "@loomix/schema/catalog";
import type { ContentContext } from "../extraction/content/context.ts";
import { readCatalogMetadata } from "../source/client/catalog-metadata.ts";

export function createCatalogMetadata(context: ContentContext) {
  const source = readCatalogMetadata(context.tables, context.gameplayTags.index);
  const metadata = (id: number, seed = false, extraReason?: "neighborClothing") => {
    const admissionReasons: CatalogRecord["admissionReasons"] = [];
    if (context.scope.encyclopedia.has(id)) admissionReasons.push("encyclopedia");
    if (context.scope.manual.has(id)) admissionReasons.push("manual");
    if (seed) admissionReasons.push("deterministicSeed");
    if (extraReason) admissionReasons.push(extraReason);
    if (!admissionReasons.length) throw new Error(`Item is outside admission scope ${id}`);
    return { admissionReasons, ...source.record(id).value };
  };
  return { clientTypes: source.clientTypes, metadata };
}
