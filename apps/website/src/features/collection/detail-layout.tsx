import type { ReactNode } from "react";
import { QualityBadge } from "./quality";
import { Skeleton } from "@/ui/components/skeleton";

type DetailField = readonly [label: string, value: string | null];

export function CollectionDetailLayout({
  image,
  title,
  quality,
  description,
  fields,
  children,
}: {
  image: ReactNode;
  title: string;
  quality: number | null;
  description?: ReactNode;
  fields: readonly DetailField[];
  children?: ReactNode;
}) {
  return (
    <section className="pb-8">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,1fr)] lg:gap-12">
        <div className="overflow-hidden rounded-4xl border bg-muted/30 lg:sticky lg:top-6">
          {image}
        </div>
        <div className="min-w-0 space-y-4">
          <div className="space-y-3">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight wrap-break-word sm:text-4xl">
              {title}
            </h1>
            {quality === null ? (
              <p className="text-sm text-muted-foreground">品阶：未提供</p>
            ) : (
              <QualityBadge quality={quality} />
            )}
          </div>
          {description}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y py-5">
            {fields.map(([label, value]) => (
              <div key={label} className="min-w-0 space-y-1.5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm leading-6 whitespace-pre-line wrap-break-word">
                  {value || "未提供"}
                </dd>
              </div>
            ))}
          </dl>
          {children}
        </div>
      </div>
    </section>
  );
}

export function CollectionDetailLoading({ label }: { label: string }) {
  return (
    <section aria-label={label} aria-busy="true" className="space-y-8 pb-8">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,1fr)] lg:gap-12">
        <Skeleton className="aspect-square rounded-4xl" />
        <div className="space-y-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </section>
  );
}
