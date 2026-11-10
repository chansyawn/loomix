import { createContext, useContext, useLayoutEffect, useRef } from "react";
import type { OverviewRecord } from "./catalog";
import { recordFields } from "./catalog";
import { RecordImage } from "./record-image";
import { QualityBadge } from "./quality";

export const RecordDetailContext = createContext<{
  record: OverviewRecord;
  focus?: OverviewRecord;
} | null>(null);
export function FocusedRecordInfo({ record }: { record: OverviewRecord }) {
  const element = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    element.current?.scrollIntoView({ block: "nearest" });
  }, [record.id]);
  return (
    <section
      className="space-y-4 rounded-xl border p-4"
      aria-label={`${record.name}基础信息`}
      ref={element}
    >
      <div className="flex items-center gap-4">
        <div className="size-20 shrink-0">
          <RecordImage image={record.image} name={record.name} compact />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{record.name}</h2>
          {record.quality !== null ? <QualityBadge quality={record.quality} /> : null}
        </div>
      </div>
      {record.description ? (
        <p className="text-sm/7 whitespace-pre-line">{record.description}</p>
      ) : null}
      <dl className="grid gap-3 sm:grid-cols-2">
        {recordFields(record).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm">{value ?? "未提供"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function RecordFocusedExtras() {
  const context = useContext(RecordDetailContext);
  return context?.focus ? (
    <div className="mt-6">
      <FocusedRecordInfo record={context.focus} />
    </div>
  ) : null;
}
export function useRecordCommonFields(fields: readonly (readonly [string, string | null])[]) {
  const context = useContext(RecordDetailContext);
  if (!context) return fields;
  const labels = new Set(fields.map(([label]) => label));
  return [...fields, ...recordFields(context.record).filter(([label]) => !labels.has(label))];
}
