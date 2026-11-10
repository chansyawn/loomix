import { createContext, useContext, useLayoutEffect, useRef } from "react";
import type { CollectionCatalog, OverviewRecord } from "./catalog";
import { tagPath, recordFields } from "./catalog";
import { RecordImage } from "./record-image";
import { QualityBadge } from "./quality";

export const RecordDetailContext = createContext<{
  data: CollectionCatalog;
  record: OverviewRecord;
  focus?: OverviewRecord;
} | null>(null);
const groupNames: Record<number, string> = {
  6: "分类标签",
  7: "检索标签",
  8: "区域／风味",
  9: "颜色",
  10: "其他标签（10）",
  11: "材质",
  12: "风格",
  13: "其他标签（13）",
  14: "尺寸标签",
  15: "补充标签",
};
export function RecordGameplayTags({
  record,
  data,
}: {
  record: OverviewRecord;
  data: CollectionCatalog;
}) {
  const groups = record.record.gameplayTagGroups.filter((group) => group.tagIds.length);
  if (!groups.length) return null;
  return (
    <details className="rounded-xl border p-4">
      <summary className="cursor-pointer text-sm font-medium">
        GameplayTag · {record.directTags.length}
      </summary>
      <p className="mt-3 text-xs text-muted-foreground">
        客户端类型：{record.record.clientType} · 次级类型：
        {record.record.clientSecondaryType ?? "未配置"}
      </p>
      <dl className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.field}>
            <dt className="mb-2 text-sm font-medium">{groupNames[group.field]}</dt>
            <dd>
              <ul className="space-y-2">
                {group.tagIds.map((id) => {
                  const tag = data.tagsById.get(id)!;
                  return (
                    <li key={id} className="text-sm">
                      <span>{tag.displayName ?? tag.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        #{id}
                        {tag.enumName ? ` · ${tag.enumName}` : ""}
                      </span>
                      <p className="text-xs text-muted-foreground">{tagPath(data, id)}</p>
                    </li>
                  );
                })}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
export function FocusedRecordInfo({
  record,
  data,
}: {
  record: OverviewRecord;
  data: CollectionCatalog;
}) {
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
      <RecordGameplayTags record={record} data={data} />
    </section>
  );
}
export function RecordCommonExtras() {
  const context = useContext(RecordDetailContext);
  return context ? <RecordGameplayTags record={context.record} data={context.data} /> : null;
}
export function RecordFocusedExtras() {
  const context = useContext(RecordDetailContext);
  return context?.focus ? <FocusedRecordInfo record={context.focus} data={context.data} /> : null;
}
export function useRecordCommonFields(fields: readonly (readonly [string, string | null])[]) {
  const context = useContext(RecordDetailContext);
  if (!context) return fields;
  const labels = new Set(fields.map(([label]) => label));
  return [...fields, ...recordFields(context.record).filter(([label]) => !labels.has(label))];
}
