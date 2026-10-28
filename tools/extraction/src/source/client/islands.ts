import type { Tables } from "../../extraction/decode/tables.ts";
import { profile } from "../../profile.ts";

export function readIslandTable(
  tables: Pick<Tables, "rows" | "id" | "text" | "uint" | "string" | "fields">,
) {
  return tables.rows(profile.roots.islands).map((row) => {
    if (tables.fields(row).length > 28) throw new Error("Unexpected island table layout");
    const id = tables.id(row);
    const name = tables.text(row, 1);
    const sceneId = tables.uint(row, 16);
    if (!name?.trim() || !sceneId || sceneId <= 0)
      throw new Error(`Unresolved island identity ${id}`);
    const illustration = tables.string(row, 27)?.trim().replaceAll("\\", "/") || null;
    return { row, id, name, sceneId, illustration };
  });
}
