import type { ReactNode } from "react";
import { cn } from "@/ui/lib/utils";

export type DetailField = readonly [
  label: string,
  value: ReactNode,
  options?: { anchor?: string; alias?: string; fullWidth?: boolean },
];

export type DetailFieldGroup = { title: string; fields: readonly DetailField[] };

export function DetailFields({
  fields,
}: {
  fields: readonly DetailField[] | { groups: readonly DetailFieldGroup[] };
}) {
  if (!("groups" in fields)) return fields.length > 0 && <FieldList fields={fields} />;
  const groups = fields.groups.filter((group) => group.fields.length > 0);
  return groups.map((group) => (
    <div key={group.title} className="grid gap-2 border-t pt-3">
      {groups.length > 1 && <h2 className="text-sm font-semibold">{group.title}</h2>}
      <FieldList fields={group.fields} compact />
    </div>
  ));
}

function FieldList({ fields, compact }: { fields: readonly DetailField[]; compact?: boolean }) {
  return (
    <dl
      className={cn(
        "grid",
        compact
          ? "gap-x-5 gap-y-2 @min-[27rem]/detail-fields:grid-cols-2"
          : "gap-3 @min-[22rem]/detail-fields:grid-cols-2 @min-[24rem]/detail-fields:gap-4",
      )}
    >
      {fields.map(([label, value, options], index) => {
        const { anchor, alias, fullWidth } = options ?? {};
        return (
          <div
            key={`${label}-${index}`}
            id={anchor}
            className={cn(
              "flex min-w-0",
              compact
                ? "flex-wrap items-baseline gap-x-2.5 gap-y-1"
                : "flex-col gap-1.5 rounded-xl bg-muted/40 p-3 @min-[24rem]/detail-fields:p-4",
              fullWidth && "col-span-full",
            )}
          >
            <dt id={anchor && `${anchor}-heading`} className="text-xs/5 text-muted-foreground">
              {alias ? (
                <span id={alias}>
                  <span id={`${alias}-heading`}>{label}</span>
                </span>
              ) : (
                label
              )}
            </dt>
            <dd className="max-w-full min-w-0 text-sm/6 wrap-anywhere whitespace-pre-line">
              {value === "" || value == null ? "未提供" : value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
