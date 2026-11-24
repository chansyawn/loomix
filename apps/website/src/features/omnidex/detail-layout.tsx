import { CatalogEntryContext, useRecordCommonFields } from "./catalog-entry-context";
import { useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { InfoIcon } from "lucide-react";
import { QualityMarker } from "./quality";
import { Skeleton } from "@/ui/components/skeleton";
import { CatalogDetailToc, detailOverviewId } from "./detail-toc";
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
  "grid items-start gap-6 pb-10 @min-[48rem]/catalog-detail:grid-cols-[clamp(14rem,25%,18rem)_minmax(0,1fr)] @min-[48rem]/catalog-detail:gap-10 @min-[48rem]/catalog-detail:pt-6";
const catalogRail =
  "contents @min-[48rem]/catalog-detail:flex @min-[48rem]/catalog-detail:flex-col @min-[48rem]/catalog-detail:self-stretch";
const catalogImage =
  "mx-auto w-full max-w-72 overflow-hidden rounded-3xl @min-[48rem]/catalog-detail:mb-4";

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
      id={entry ? detailOverviewId : undefined}
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
  const content = useRef<HTMLDivElement>(null);
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
      <div className={catalogGrid}>
        <div className={catalogRail}>
          <div
            ref={header}
            className="sticky top-0 z-20 flex min-w-0 items-center justify-between gap-1 border-b bg-background py-1 @min-[48rem]/catalog-detail:top-4 @min-[48rem]/catalog-detail:block @min-[48rem]/catalog-detail:max-h-[calc(100svh-6rem)] @min-[48rem]/catalog-detail:shrink-0 @min-[48rem]/catalog-detail:space-y-2 @min-[48rem]/catalog-detail:overflow-y-auto @min-[48rem]/catalog-detail:rounded-2xl @min-[48rem]/catalog-detail:border @min-[48rem]/catalog-detail:p-2.5"
          >
            <CatalogDetailToc sections={sections} contentRef={content} />
            {navigation}
          </div>
          <div
            className={`${catalogImage} border bg-muted/30 @min-[48rem]/catalog-detail:order-first`}
          >
            {image}
          </div>
        </div>
        <div
          ref={content}
          className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-7 [--catalog-detail-anchor-offset:calc(var(--catalog-detail-nav-height,0px)+1rem)] sm:gap-8 @min-[48rem]/catalog-detail:[--catalog-detail-anchor-offset:1rem] **:[[id]]:scroll-mt-(--catalog-detail-anchor-offset)"
        >
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
      <div className={catalogGrid}>
        <div className={catalogRail}>
          <div className="space-y-2 border-b py-2 @min-[48rem]/catalog-detail:rounded-2xl @min-[48rem]/catalog-detail:border @min-[48rem]/catalog-detail:p-3">
            <Skeleton className="h-9 w-24 @min-[48rem]/catalog-detail:h-4" />
            <Skeleton className="hidden h-8 w-full @min-[48rem]/catalog-detail:block" />
            <Skeleton className="hidden h-8 w-full @min-[48rem]/catalog-detail:block" />
          </div>
          <div className={`${catalogImage} @min-[48rem]/catalog-detail:order-first`}>
            <Skeleton className="aspect-square w-full" />
          </div>
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
