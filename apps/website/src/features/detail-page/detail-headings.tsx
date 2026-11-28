import { useLayoutEffect, useRef, type ReactNode } from "react";

export type DetailSection = {
  id: string;
  title: string;
  headingId?: string;
  count?: number;
  content: ReactNode;
};

export function DetailChapter({
  id,
  title,
  headingId = `${id}-heading`,
  count,
  content,
}: DetailSection) {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const heading = headingRef.current;
    if (!section || !heading) return;
    const measure = () =>
      section.style.setProperty("--detail-heading-height", `${heading.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(heading);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      ref={sectionRef}
      id={id}
      data-detail-section={id}
      aria-labelledby={headingId}
      className="grid min-w-0 gap-4"
    >
      <h2
        ref={headingRef}
        id={headingId}
        className="sticky top-(--detail-sticky-top) z-10 flex items-baseline gap-2 border-b bg-background py-2 text-lg font-semibold wrap-anywhere"
      >
        {title}
        {count !== undefined && (
          <span className="text-sm font-normal text-muted-foreground tabular-nums">{count}</span>
        )}
      </h2>
      <div className="min-w-0 [--detail-anchor-offset:calc(var(--detail-sticky-top)+var(--detail-heading-height,0px))]">
        {content}
      </div>
    </section>
  );
}
