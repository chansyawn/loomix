import type { RecordType } from "@loomix/schema/extraction";
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
