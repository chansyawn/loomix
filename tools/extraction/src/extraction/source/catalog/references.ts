import type { ItemOf } from "@loomix/schema/catalog";
import type { ContentContext } from "./context.ts";
import type { SourceProof } from "../../model.ts";
import { plainText } from "./model.ts";
import { localizedSources } from "./collection/evidence.ts";

export function readReferences(context: ContentContext, ids: readonly number[]) {
  const { tables, main } = context;
  const proofs: SourceProof[] = [];
  const items = ids.map((id): ItemOf<"reference"> => {
    const name = plainText(tables.text(main.get(id), 1));
    if (!name) throw new Error(`Unresolved referenced item ${id}`);
    const rows = tables.rows(325).filter((row) => tables.id(row) === id);
    const descriptions = new Set(rows.map((row) => plainText(tables.text(row, 27))));
    if (descriptions.size > 1) throw new Error(`Conflicting referenced item details ${id}`);
    const description = [...descriptions][0] ?? null;
    for (const [field, value, sources] of [
      ["kind", "reference", localizedSources(tables, main.get(id), [0])],
      ["name", name, localizedSources(tables, main.get(id), [0, 1])],
      ["description", description, rows.flatMap((row) => localizedSources(tables, row, [0, 27]))],
    ] as const)
      proofs.push({
        owner: "item",
        id,
        field,
        status: value === null ? "absent" : "confirmed",
        sources: sources.map(({ file, table, rowOffset, fields }) => ({
          kind: "table",
          file,
          table,
          rowOffset,
          fields,
        })),
        ruleId: "client.catalog.reference_details",
        reasonCode: value === null ? "item_detail_not_configured" : null,
      });
    return { id, kind: "reference", name, description };
  });
  return { items, proofs };
}
