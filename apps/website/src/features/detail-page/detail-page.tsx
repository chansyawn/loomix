import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { findWikiScroll } from "@/infrastructure/wiki-scroll";
import { Skeleton } from "@/ui/components/skeleton";
import { cn } from "@/ui/lib/utils";
import { DetailChapter, type DetailSection } from "./detail-headings";
import { DetailNavGroup, type DetailNavigation } from "./detail-nav-group";
import { DetailToc } from "./detail-toc";
import { DetailFields, type DetailFieldGroup } from "./detail-fields";

export type { DetailField } from "./detail-fields";

export type { DetailSection } from "./detail-headings";

export type DetailPageProps = {
  image: ReactNode;
  title: string;
  titleId?: string;
  titleLeading?: ReactNode;
  titleActions?: ReactNode;
  titleMetadata?: ReactNode;
  description?: ReactNode;
  fieldGroups: readonly DetailFieldGroup[];
  overviewId?: string;
  sections: readonly DetailSection[];
  relatedNavigation?: DetailNavigation;
};

export function DetailPage({
  image,
  title,
  titleId,
  titleLeading,
  titleActions,
  titleMetadata,
  description,
  fieldGroups,
  overviewId = "detail-overview",
  sections,
  relatedNavigation,
}: DetailPageProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const targets = [{ id: overviewId, title: "概览" }, ...sections];

  return (
    <DetailFrame
      image={image}
      contentRef={contentRef}
      navigationRef={navigationRef}
      navigation={
        <>
          {sections.length > 0 && (
            <DetailToc targets={targets} contentRef={contentRef} navigationRef={navigationRef} />
          )}
          {relatedNavigation && <DetailNavGroup {...relatedNavigation} />}
        </>
      }
    >
      <section
        id={overviewId}
        data-detail-section={overviewId}
        aria-labelledby={titleId}
        className="@container/detail-fields flex min-w-0 flex-col gap-4"
      >
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1
              id={titleId}
              className="flex min-w-0 items-center gap-3 text-3xl/tight font-semibold tracking-tight sm:text-4xl"
            >
              {titleLeading}
              <span className="min-w-0 wrap-anywhere">{title}</span>
            </h1>
            {titleActions}
          </div>
          {titleMetadata}
        </div>
        {description}
        <DetailFields groups={fieldGroups} />
      </section>
      {sections.map((section) => (
        <DetailChapter key={section.id} {...section} />
      ))}
    </DetailFrame>
  );
}

function DetailFrame({
  image,
  navigation,
  children,
  contentRef,
  navigationRef,
  loadingLabel,
}: {
  image: ReactNode;
  navigation: ReactNode;
  children: ReactNode;
  contentRef?: RefObject<HTMLDivElement | null>;
  navigationRef?: RefObject<HTMLDivElement | null>;
  loadingLabel?: string;
}) {
  const frameRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const navigation = navigationRef?.current;
    const scrollport = findWikiScroll(frame);
    if (!frame || !navigation || !scrollport) return;

    const measure = () => {
      frame.style.setProperty("--detail-scrollport-height", `${scrollport.clientHeight}px`);
      frame.style.setProperty("--detail-nav-height", `${navigation.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scrollport);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, [navigationRef]);

  return (
    <article
      ref={frameRef}
      aria-label={loadingLabel}
      aria-busy={loadingLabel ? true : undefined}
      className="@container/detail-page mx-auto w-full max-w-6xl"
    >
      <div className="grid items-start gap-6 pb-10 @min-[48rem]/detail-page:grid-cols-[clamp(14rem,25%,18rem)_minmax(0,1fr)] @min-[48rem]/detail-page:gap-10 @min-[48rem]/detail-page:pt-6">
        <div className="contents @min-[48rem]/detail-page:flex @min-[48rem]/detail-page:flex-col @min-[48rem]/detail-page:self-stretch">
          <div
            ref={navigationRef}
            className="sticky top-0 z-20 flex min-w-0 items-center justify-between gap-1 border-b bg-background py-1 empty:hidden @min-[48rem]/detail-page:top-4 @min-[48rem]/detail-page:max-h-[calc(var(--detail-scrollport-height,100svh)-2rem)] @min-[48rem]/detail-page:shrink-0 @min-[48rem]/detail-page:flex-col @min-[48rem]/detail-page:items-stretch @min-[48rem]/detail-page:gap-2 @min-[48rem]/detail-page:overflow-y-auto @min-[48rem]/detail-page:rounded-2xl @min-[48rem]/detail-page:border @min-[48rem]/detail-page:p-2.5"
          >
            {navigation}
          </div>
          <div className="mx-auto w-full max-w-72 overflow-hidden rounded-3xl border bg-muted/30 @min-[48rem]/detail-page:order-first @min-[48rem]/detail-page:mb-4">
            {image}
          </div>
        </div>
        <div
          ref={contentRef}
          className="@container/detail-content mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-7 [--detail-anchor-offset:var(--detail-sticky-top)] [--detail-sticky-top:var(--detail-nav-height,0px)] sm:gap-8 @min-[48rem]/detail-page:[--detail-sticky-top:0px] **:[[id]]:scroll-mt-(--detail-anchor-offset)"
        >
          {children}
        </div>
      </div>
    </article>
  );
}

export function DetailPageLoading({
  label,
  imageAspect = "aspect-square",
}: {
  label: string;
  imageAspect?: "aspect-square" | "aspect-video" | "aspect-2/1";
}) {
  return (
    <DetailFrame
      loadingLabel={label}
      image={<Skeleton className={cn("w-full", imageAspect)} />}
      navigation={
        <>
          <Skeleton className="h-11 w-24 @min-[48rem]/detail-page:h-4" />
          <Skeleton className="hidden h-8 w-full @min-[48rem]/detail-page:block" />
          <Skeleton className="hidden h-8 w-full @min-[48rem]/detail-page:block" />
        </>
      }
    >
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </DetailFrame>
  );
}
