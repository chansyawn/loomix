import { profile } from "../../../profile.ts";
import type { EvidenceSource } from "../../evidence/domain-schema.ts";
import type { TableRow } from "../../types.ts";
import type { Tables } from "../decode/tables.ts";

export function readResourceGroups(
  tables: Tables,
  source: (row: TableRow, ...fields: number[]) => EvidenceSource,
) {
  const groupIds = new Set<number>();
  const resourceProfiles = tables.rows(profile.starsea.resourceProfiles).map((row) => {
    const mappings = (tables.string(row, 3) ?? "").split(",").map((entry) => {
      const match = /^([^:]+):(\d+)$/.exec(entry.trim());
      if (!match) throw new Error(`Invalid starsea resource mapping ${entry}`);
      const dropGroupId = Number(match[2]);
      groupIds.add(dropGroupId);
      return { label: match[1], dropGroupId };
    });
    return {
      id: tables.id(row),
      field1: tables.uint(row, 1),
      field2: tables.uint(row, 2),
      mappings,
      source: source(row, 0, 1, 2, 3),
    };
  });
  const itemRows = tables.byId(318, (row) => tables.text(row, 1));
  const groups = new Map<number, TableRow[]>();
  for (const row of tables.rows(profile.starsea.dropGroups)) {
    const id = tables.id(row);
    if (!groupIds.has(id)) continue;
    const entries = groups.get(id) ?? [];
    entries.push(row);
    groups.set(id, entries);
  }
  const resourceGroups = [...groupIds]
    .sort((first, second) => first - second)
    .map((id) => {
      const rows = groups.get(id);
      if (!rows?.length) throw new Error(`Missing starsea resource group ${id}`);
      return {
        id,
        entries: rows.map((row) => {
          const itemId = tables.uint(row, 2);
          return {
            itemId,
            name: tables.text(itemRows.get(itemId), 1),
            field4: tables.uint(row, 4),
            field5: tables.uint(row, 5),
            source: source(row, 0, 2, 4, 5),
          };
        }),
      };
    });
  return { resourceProfiles, resourceGroups };
}
