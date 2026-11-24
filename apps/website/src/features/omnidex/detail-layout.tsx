import { CatalogEntryContext, useRecordCommonFields } from "./catalog-entry-context";
import { useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { InfoIcon } from "lucide-react";
import { QualityMarker } from "./quality";
import { Skeleton } from "@/ui/components/skeleton";
import { CatalogDetailToc } from "./detail-toc";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/ui/components/empty";

type DetailField = readonly [label: string, value: string | null];
export type DetailSection = {
  id: string;
  title: string;
  content: ReactNode;
};

const catalogFrame = "@container/catalog-detail mx-auto w-full max-w-288";
const catalogGrid =
  "grid items-start gap-6 @min-[48rem]/catalog-detail:grid-cols-[clamp(14rem,29%,20rem)_minmax(0,1fr)] @min-[48rem]/catalog-detail:gap-10";

export function DetailLayout({
  image,
  title,
  titleActions,
  quality,
  description,
  fields,
  navigation,
  sections = [],
  showEmptyExtras,
  children,
}: {
  image: ReactNode;
  title: string;
  titleActions?: ReactNode;
  quality?: number | null;
  description?: ReactNode;
  fields: readonly DetailField[];
  navigation?: ReactNode;
  sections?: readonly DetailSection[];
  showEmptyExtras?: boolean;
  children?: ReactNode;
}) {
  const commonFields = useRecordCommonFields(fields);
  const entry = useContext(CatalogEntryContext);
  const overview = (
    <div
      id={entry ? "detail-overview" : undefined}
      className="@container/detail-fields min-w-0 space-y-4"
    >
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
      <dl className="grid grid-cols-1 gap-3 @min-[22rem]/detail-fields:grid-cols-2 @min-[24rem]/detail-fields:gap-4">
        {commonFields.map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 space-y-1.5 rounded-xl bg-muted/40 p-3 @min-[24rem]/detail-fields:p-4"
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm/6 wrap-break-word whitespace-pre-line">{value || "未提供"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
  if (entry) {
    const visibleSections = entry.usesSection ? [...sections, entry.usesSection] : sections;
    return (
      <CatalogDetailLayout image={image} navigation={navigation} sections={visibleSections}>
        {overview}
        {visibleSections.map(({ id, title, content }) => (
          <section
            key={id}
            aria-labelledby={id}
            className="flex min-w-0 flex-col gap-4 border-t pt-6 sm:pt-8"
          >
            <h2 id={id} className="text-lg font-semibold">
              {title}
            </h2>
            {content}
          </section>
        ))}
        {showEmptyExtras && visibleSections.length === 0 && <DetailEmpty />}
      </CatalogDetailLayout>
    );
  }
  return (
    <section className="pb-8">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)] lg:gap-12">
        <div className="mx-auto w-full max-w-104 overflow-hidden rounded-4xl border bg-muted/30 lg:sticky lg:top-6 lg:mx-0">
          {image}
        </div>
        {overview}
      </div>
      {children && <div className="mt-10 space-y-6 border-t-3 border-dotted pt-8">{children}</div>}
    </section>
  );
}

function CatalogDetailLayout({
  image,
  navigation,
  sections,
  children,
}: {
  image: ReactNode;
  navigation?: ReactNode;
  sections: readonly DetailSection[];
  children: ReactNode;
}) {
  const frame = useRef<HTMLElement>(null);
  const header = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const container = frame.current;
    const bar = header.current;
    if (!container || !bar) return;
    const measure = () =>
      container.style.setProperty("--catalog-detail-nav-height", `${bar.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <article ref={frame} className={catalogFrame}>
      <div ref={header} className="sticky top-0 z-20 min-w-0 border-b bg-background">
        {navigation}
        <CatalogDetailToc sections={sections} />
      </div>
      <div className={`${catalogGrid} pt-5 pb-10 @min-[48rem]/catalog-detail:pt-8`}>
        <div className="mx-auto w-full max-w-72 overflow-hidden rounded-3xl border bg-muted/30 @min-[48rem]/catalog-detail:top-[calc(var(--catalog-detail-nav-height,0px)+1rem)] @min-[48rem]/catalog-detail:max-w-none @min-[48rem]/catalog-detail:[@media(min-height:42rem)]:sticky">
          {image}
        </div>
        <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-7 sm:gap-8 **:[[id]]:scroll-mt-[calc(var(--catalog-detail-nav-height,0px)+1rem)]">
          {children}
        </div>
      </div>
    </article>
  );
}

function DetailEmpty() {
  return (
    <Empty variant="muted" className="min-h-44">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InfoIcon />
        </EmptyMedia>
        <EmptyTitle>暂时没有更多的信息</EmptyTitle>
        <EmptyDescription>更多资料收录后会在这里展示</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
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

export function CatalogDetailLoading() {
  return (
    <section aria-label="正在加载物品详情" aria-busy="true" className={catalogFrame}>
      <div className="border-b py-2">
        <Skeleton className="h-9 w-24" />
      </div>
      <div className={`${catalogGrid} pt-5 pb-10 @min-[48rem]/catalog-detail:pt-8`}>
        <div className="mx-auto w-full max-w-72 overflow-hidden rounded-3xl @min-[48rem]/catalog-detail:max-w-none">
          <Skeleton className="aspect-square w-full" />
        </div>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </section>
  );
}
