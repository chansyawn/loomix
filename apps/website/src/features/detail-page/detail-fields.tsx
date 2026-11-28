import { useState, type ReactNode } from "react";
import { InfoIcon } from "lucide-react";
import { Button } from "@/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/tooltip";
import { cn } from "@/ui/lib/utils";
import { FieldValue } from "./field-value";
import type { DetailField, DetailFieldGroup } from "./field-model";
export type { DetailField, DetailFieldGroup } from "./field-model";

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

function TitleHint({ title, hint }: { title: string; hint: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        aria-label={`${title}说明`}
        closeOnClick={false}
        onClick={() => setOpen(true)}
        render={<Button variant="ghost" size="icon-xs" />}
      >
        <InfoIcon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

export function DetailFields({ groups }: { groups: readonly DetailFieldGroup[] }) {
  return groups.map((group) => {
    const fields = group.fields.filter(({ value }) =>
      Array.isArray(value) ? value.length > 0 : value != null && value !== "",
    );
    if (!fields.length) return null;
    const Container = group.title ? "section" : "div";
    return (
      <Container
        key={group.title ?? "fields"}
        id={group.anchor}
        aria-label={group.title}
        className="grid gap-2 border-t pt-3"
      >
        {group.title && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <h2 className="text-sm font-medium">{group.title}</h2>
            {group.titleHint && <TitleHint title={group.title} hint={group.titleHint} />}
          </div>
        )}
        <FieldList fields={fields} />
      </Container>
    );
  });
}

function FieldList({ fields }: { fields: readonly DetailField[] }) {
  return (
    <dl className="grid gap-x-5 gap-y-2 @min-[27rem]/detail-fields:grid-cols-2">
      {fields.map((field) => {
        const { label, anchor, fullWidth } = field;
        return (
          <div
            key={anchor ?? label}
            id={anchor}
            className={cn(
              "grid min-w-0 grid-cols-[fit-content(42%)_minmax(0,1fr)] items-start gap-x-2.5",
              (fullWidth || field.kind === "effects" || field.kind === "prices") && "col-span-full",
            )}
          >
            <dt id={anchor && `${anchor}-heading`} className="py-1 text-xs/6 text-muted-foreground">
              {label}
            </dt>
            <dd className="min-h-8 min-w-0 text-sm/6 wrap-anywhere">
              <FieldValue field={field} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
