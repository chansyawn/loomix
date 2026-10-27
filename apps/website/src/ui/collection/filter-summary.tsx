import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/ui/components/button";

export interface FilterSummaryProps {
  status: ReactNode;
  chips: ReactNode[];
  onClear: () => void;
}

function getScrollState(element: HTMLDivElement) {
  const maxScrollLeft = element.scrollWidth - element.clientWidth;
  return {
    canScrollLeft: element.scrollLeft > 1,
    canScrollRight: maxScrollLeft - element.scrollLeft > 1,
  };
}

export function FilterSummary({ status, chips, onClear }: FilterSummaryProps) {
  const chipsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasChips = chips.length > 0;
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  useLayoutEffect(() => {
    const element = chipsRef.current;
    const content = contentRef.current;
    if (!element || !content) return;

    const measure = () => {
      const next = getScrollState(element);
      setScrollState((previous) =>
        previous.canScrollLeft === next.canScrollLeft &&
        previous.canScrollRight === next.canScrollRight
          ? previous
          : next,
      );
    };
    measure();
    element.addEventListener("scroll", measure, { passive: true });

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    resizeObserver?.observe(element);
    resizeObserver?.observe(content);

    return () => {
      element.removeEventListener("scroll", measure);
      resizeObserver?.disconnect();
    };
  }, [hasChips]);

  return (
    <div className="@container/filter-summary">
      <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 py-3 @min-[28rem]/filter-summary:grid-cols-[auto_minmax(0,1fr)_auto] @min-[28rem]/filter-summary:py-0">
        <div className="col-start-1 row-start-1 whitespace-nowrap">{status}</div>
        {hasChips && (
          <div className="relative col-span-2 col-start-1 row-start-2 min-w-0 @min-[28rem]/filter-summary:col-span-1 @min-[28rem]/filter-summary:col-start-2 @min-[28rem]/filter-summary:row-start-1">
            <div
              ref={chipsRef}
              role="region"
              aria-label="当前筛选"
              tabIndex={0}
              className="scrollbar-none overflow-x-auto rounded-md focus-visible:outline-2 focus-visible:outline-ring"
            >
              <div ref={contentRef} className="flex w-max min-w-full items-center gap-2 py-1">
                {chips}
              </div>
            </div>
            {scrollState.canScrollLeft && (
              <span
                data-testid="filter-summary-fade-left"
                className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r from-background to-transparent"
                aria-hidden="true"
              />
            )}
            {scrollState.canScrollRight && (
              <span
                data-testid="filter-summary-fade-right"
                className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-background to-transparent"
                aria-hidden="true"
              />
            )}
          </div>
        )}
        {hasChips && (
          <Button
            variant="ghost"
            size="sm"
            className="col-start-2 row-start-1 justify-self-end whitespace-nowrap @min-[28rem]/filter-summary:col-start-3"
            onClick={onClear}
          >
            清空筛选
          </Button>
        )}
      </div>
    </div>
  );
}
