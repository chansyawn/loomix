import { createContext, useContext } from "react";
import type { CatalogEntryRow } from "./catalog";
import { recordFields } from "./catalog";
import type { DetailSection } from "./detail-layout";

export const CatalogEntryContext = createContext<{
  record: CatalogEntryRow;
  usesSection?: DetailSection;
} | null>(null);
export function useRecordCommonFields(fields: readonly (readonly [string, string | null])[]) {
  const context = useContext(CatalogEntryContext);
  if (!context) return fields;
  const labels = new Set(fields.map(([label]) => label));
  return [...fields, ...recordFields(context.record).filter(([label]) => !labels.has(label))];
}
