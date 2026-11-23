import type { ReactNode } from "react";
import { Button } from "@/ui/components/button";
import { ScrollFade } from "@/ui/components/scroll-fade";

export interface FilterSummaryProps {
  status: ReactNode;
  chips: ReactNode[];
  onClear: () => void;
}

export function FilterSummary({ status, chips, onClear }: FilterSummaryProps) {
  const hasChips = chips.length > 0;

  return (
    <div className="@container/filter-summary">
      <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 py-3 @min-[28rem]/filter-summary:grid-cols-[auto_minmax(0,1fr)_auto] @min-[28rem]/filter-summary:py-0">
        <div className="col-start-1 row-start-1 whitespace-nowrap">{status}</div>
        {hasChips && (
          <ScrollFade
            label="当前筛选"
            className="col-span-2 col-start-1 row-start-2 @min-[28rem]/filter-summary:col-span-1 @min-[28rem]/filter-summary:col-start-2 @min-[28rem]/filter-summary:row-start-1"
          >
            <div className="flex items-center gap-2 py-1">{chips}</div>
          </ScrollFade>
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
