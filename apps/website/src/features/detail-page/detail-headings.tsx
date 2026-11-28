import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/ui/components/button";
import { Collapsible, CollapsibleTrigger } from "@/ui/components/collapsible";

export type DetailSubsection = {
  id: string;
  title: string;
  content: ReactNode;
  headingTrailing?: ReactNode;
  disclosure?: { total: number };
};

const stickyHeadingClass =
  "sticky top-(--detail-sticky-top) z-10 border-b bg-background py-2 before:pointer-events-none before:absolute before:-inset-x-[2px] before:top-0 before:-bottom-px before:-z-10 before:border-x-2 before:border-background";
const headingBodyClass =
  "min-w-0 [--detail-anchor-offset:calc(var(--detail-sticky-top)+var(--detail-heading-height,0px))]";

function useDetailHeadingHeight<Container extends HTMLElement>() {
  const containerRef = useRef<Container>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const heading = headingRef.current;
    if (!container || !heading) return;

    const measure = () =>
      container.style.setProperty("--detail-heading-height", `${heading.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  return { containerRef, headingRef };
}

export function DetailChapter({
  id,
  labelledBy,
  heading,
  children,
  subsections,
}: {
  id: string;
  labelledBy: string;
  heading: ReactNode;
  children: ReactNode;
  subsections?: readonly DetailSubsection[];
}) {
  const { containerRef, headingRef } = useDetailHeadingHeight<HTMLDivElement>();

  return (
    <section
      id={id}
      data-detail-section={id}
      aria-labelledby={labelledBy}
      className="flex min-w-0 flex-col gap-4"
    >
      <div ref={containerRef} className="min-w-0">
        <div ref={headingRef} className={stickyHeadingClass}>
          {heading}
        </div>
        {children != null && <div className={`${headingBodyClass} mt-4`}>{children}</div>}
      </div>
      {subsections && (
        <div className="flex min-w-0 flex-col gap-6">
          {subsections.map((subsection) => (
            <DetailSubsectionBlock key={subsection.id} {...subsection} />
          ))}
        </div>
      )}
    </section>
  );
}

function DetailSubsectionBlock({
  id,
  title,
  headingTrailing,
  content,
  disclosure,
}: DetailSubsection) {
  const { containerRef, headingRef } = useDetailHeadingHeight<HTMLElement>();
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const returnToHeading = useRef(false);

  useLayoutEffect(() => {
    if (!expanded && returnToHeading.current) {
      returnToHeading.current = false;
      containerRef.current?.scrollIntoView({ block: "start", inline: "nearest" });
    }
  }, [expanded, containerRef]);

  function changeExpanded(nextExpanded: boolean) {
    const section = containerRef.current;
    const heading = headingRef.current;
    returnToHeading.current = Boolean(
      !nextExpanded &&
      section &&
      heading &&
      heading.getBoundingClientRect().top > section.getBoundingClientRect().top + 1,
    );
    setExpanded(nextExpanded);
  }

  const section = (
    <section
      ref={containerRef}
      id={id}
      data-detail-section={id}
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-3"
    >
      <div
        ref={headingRef}
        className={`${stickyHeadingClass} flex flex-wrap items-center justify-between gap-x-3 gap-y-1`}
      >
        <h3 id={headingId} className="flex min-w-0 items-center gap-2 text-base font-semibold">
          <span className="min-w-0 wrap-anywhere">{title}</span>
          {headingTrailing}
        </h3>
        {disclosure && (
          <CollapsibleTrigger
            render={<Button variant="ghost" />}
            aria-label={expanded ? `收起${title}` : `展开全部 ${disclosure.total} 项${title}`}
            className="ms-auto h-auto min-h-8 max-w-full min-w-0 whitespace-normal"
          >
            <span className="min-w-0 wrap-anywhere">
              {expanded ? "收起" : `展开全部 ${disclosure.total} 项`}
            </span>
            {expanded ? (
              <ChevronUpIcon data-icon="inline-end" aria-hidden="true" />
            ) : (
              <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
            )}
          </CollapsibleTrigger>
        )}
      </div>
      <div className={headingBodyClass}>{content}</div>
    </section>
  );

  return disclosure ? (
    <Collapsible render={section} open={expanded} onOpenChange={changeExpanded} />
  ) : (
    section
  );
}
