import { createContext, useContext } from "react";
import type { OverviewRecord } from "./catalog";
import { recordFields } from "./catalog";

export const RecordDetailContext = createContext<{
  record: OverviewRecord;
} | null>(null);
export function useRecordCommonFields(fields: readonly (readonly [string, string | null])[]) {
  const context = useContext(RecordDetailContext);
  if (!context) return fields;
  const labels = new Set(fields.map(([label]) => label));
  return [...fields, ...recordFields(context.record).filter(([label]) => !labels.has(label))];
}
