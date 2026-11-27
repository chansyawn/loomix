import type { ItemOf } from "@loomix/schema/catalog";
import type { ContentContext } from "./context.ts";
import type { SourceProof, WithImageUses } from "../../model.ts";
import type { Row } from "../../types.ts";
import type { imageCollector } from "../images.ts";
import type { EvidenceSource } from "../../evidence/domain-schema.ts";
import { plainText } from "./model.ts";
import { localizedSources } from "./collection/evidence.ts";

export function readReferences(
  context: Pick<ContentContext, "tables" | "main">,
  ids: readonly number[],
  currencyIds: ReadonlySet<number>,
  images: Pick<ReturnType<typeof imageCollector>, "configured">,
) {
  const { tables, main } = context;
  const iconPaths = (row: Row) => [
    ...new Set(
      [4, 5].map((field) => tables.string(row, field)).filter((path): path is string => !!path),
    ),
  ];
  const currencyRows = tables.byId(325, iconPaths, new Set(currencyIds));
  const proofs: SourceProof[] = [];
  const items = ids.map((id): WithImageUses<ItemOf<"reference">> => {
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
    let image = null;
    if (currencyIds.has(id)) {
      const sources: EvidenceSource[] = rows.map((row) => ({
        kind: "table",
        file: "prepared/ed.obb",
        table: 325,
        rowOffset: row.rowOffset,
        fields: [0, 4, 5],
      }));
      if (!sources.length) sources.push({ kind: "tableScan", file: "prepared/ed.obb", table: 325 });
      image = {
        use: images.configured(
          { kind: "item", id, field: "image" },
          iconPaths(currencyRows.get(id)),
          "icon",
          sources,
          false,
          true,
        ),
      };
    } else {
      proofs.push({
        owner: "item",
        id,
        field: "image",
        status: "absent",
        sources: [],
        ruleId: "client.catalog.reference_details",
        reasonCode: "reference_icon_outside_scope",
      });
    }
    return { id, kind: "reference", name, description, image };
  });
  return { items, proofs };
}
