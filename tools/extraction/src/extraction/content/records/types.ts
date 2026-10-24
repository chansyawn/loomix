import type { RecordType } from "@loomix/content-schema";
import type { Row, TableRow } from "../../types.ts";

export interface RecordContext {
  id: number;
  group: RecordType;
  row: Row;
  main: TableRow;
  ui: Row;
  creature: Row;
  crop: TableRow | undefined;
  recipe: TableRow | undefined;
}
