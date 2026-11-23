import { useRecordCommonFields } from "./catalog-entry-context";
import { Fragment, type ReactNode } from "react";
import { InfoIcon } from "lucide-react";
import { QualityMarker } from "./quality";
import { Skeleton } from "@/ui/components/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/ui/components/empty";

type DetailField = readonly [label: string, value: string | null];
export type DetailSection = {
  key: string;
  content: ReactNode;
};

export function DetailLayout({
  image,
  title,
  titleActions,
  quality,
  description,
  fields,
  children,
}: {
  image: ReactNode;
  title: string;
  titleActions?: ReactNode;
  quality?: number | null;
  description?: ReactNode;
  fields: readonly DetailField[];
  children?: ReactNode;
}) {
  const commonFields = useRecordCommonFields(fields);
  return (
    <section className="pb-8">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)] lg:gap-12">
        <div className="mx-auto w-full max-w-104 overflow-hidden rounded-4xl border bg-muted/30 lg:sticky lg:top-6 lg:mx-0">
          {image}
        </div>
        <div className="@container/detail-fields min-w-0 space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="flex min-w-0 items-center gap-3 text-3xl/tight font-semibold tracking-tight wrap-break-word sm:text-4xl">
                {typeof quality === "number" && <QualityMarker quality={quality} />}
                <span className="min-w-0">{title}</span>
              </h1>
              {titleActions}
            </div>
            {quality === null && <p className="text-sm text-muted-foreground">品阶：未提供</p>}
          </div>
          {description}
          <dl className="grid grid-cols-1 gap-3 @min-[24rem]/detail-fields:grid-cols-2 @min-[24rem]/detail-fields:gap-4">
            {commonFields.map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 space-y-1.5 rounded-xl bg-muted/40 p-3 @min-[24rem]/detail-fields:p-4"
              >
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm/6 wrap-break-word whitespace-pre-line">
                  {value || "未提供"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {children && <div className="mt-10 space-y-6 border-t-3 border-dotted pt-8">{children}</div>}
    </section>
  );
}

export function DetailExtras({ sections }: { sections: readonly DetailSection[] }) {
  if (sections.length === 0)
    return (
      <Empty variant="muted" className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <InfoIcon />
          </EmptyMedia>
          <EmptyTitle>暂时没有更多的信息</EmptyTitle>
          <EmptyDescription>更多资料收录后会在这里展示</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return sections.map(({ key, content }) => <Fragment key={key}>{content}</Fragment>);
}

export function DetailRelatedGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4">
      {children}
    </div>
  );
}

export function DetailLoading({ label }: { label: string }) {
  return (
    <section aria-label={label} aria-busy="true" className="space-y-8 pb-8">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)] lg:gap-12">
        <Skeleton className="mx-auto aspect-square w-full max-w-104 lg:mx-0" />
        <div className="space-y-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
      <div className="mt-10 space-y-6 border-t pt-8 lg:mt-12 lg:pt-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    </section>
  );
}
