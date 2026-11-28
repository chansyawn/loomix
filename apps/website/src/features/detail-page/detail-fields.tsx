import type { ReactNode } from "react";
import { cn } from "@/ui/lib/utils";

export type DetailField = readonly [
  label: string,
  value: ReactNode,
  options?: { anchor?: string; alias?: string; fullWidth?: boolean },
];

export type DetailFieldGroup = { title: string; fields: readonly DetailField[] };

export function DetailTitleMetadata({
  id,
  category,
  children,
}: {
  id: number;
  category: string;
  children: ReactNode;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span className="min-w-0 font-medium wrap-anywhere text-foreground">{children}</span>
      <span aria-hidden="true">·</span>
      <span className="min-w-0 wrap-anywhere">
        <span className="sr-only">类别：</span>
        {category}
      </span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">
        <span className="sr-only">编号：</span>#{id}
      </span>
    </p>
  );
}

export function DetailFields({ groups }: { groups: readonly DetailFieldGroup[] }) {
  const visibleGroups = groups.filter((group) => group.fields.length > 0);
  return visibleGroups.map((group) => (
    <div key={group.title} className="grid gap-2 border-t pt-3">
      {visibleGroups.length > 1 && <h2 className="text-sm font-semibold">{group.title}</h2>}
      <FieldList fields={group.fields} />
    </div>
  ));
}

function FieldList({ fields }: { fields: readonly DetailField[] }) {
  return (
    <dl className="grid gap-x-5 gap-y-2 @min-[27rem]/detail-fields:grid-cols-2">
      {fields.map(([label, value, options], index) => {
        const { anchor, alias, fullWidth } = options ?? {};
        return (
          <div
            key={`${label}-${index}`}
            id={anchor}
            className={cn(
              "flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1",
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
