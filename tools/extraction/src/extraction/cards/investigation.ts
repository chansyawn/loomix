import type { Tables } from "../decode/tables.ts";
import { tableSource } from "../collection/evidence.ts";

export function investigateCardReferences(tables: Tables, cardIds: ReadonlySet<number>) {
  const tablesToScan = [
    { table: 675, field: 0, fields: [0, 1, 2, 3] },
    { table: 206, field: 0, fields: [0, 1, 2, 3, 6, 7] },
    { table: 281, field: 1, fields: [0, 1, 2] },
    { table: 269, field: 4, fields: [0, 1, 3, 4, 5, 6, 7, 8] },
    { table: 563, field: 2, fields: [0, 1, 2, 4, 5, 15] },
  ];
  const records = tablesToScan.flatMap(({ table, field, fields }) =>
    tables.rows(table).flatMap((row) => {
      const id = tables.uint(row, field);
      return id !== null && cardIds.has(id)
        ? [
            {
              cardIds: [id],
              source: tableSource(tables, row, fields),
              reason: "entrypoint_or_runtime_semantics_unconfirmed",
            },
          ]
        : [];
    }),
  );
  for (const row of tables.rows(381)) {
    const ids = (tables.vector(row, 1) ?? []).filter((id) => cardIds.has(id));
    if (ids.length)
      records.push({
        cardIds: ids,
        source: tableSource(tables, row, [0, 1, 2]),
        reason: "entrypoint_or_runtime_semantics_unconfirmed",
      });
  }
  return records;
}
