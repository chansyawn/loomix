import type { ContentGroup } from "@loomix/content-schema";
import type { Row, TableRow } from "../../../tasks/content/types.ts";

export interface RecordContext {
  id: number;
  group: ContentGroup;
  row: TableRow;
  main: TableRow;
  ui: Row;
  creature: Row;
  crop: TableRow | undefined;
  recipe: TableRow | undefined;
}
