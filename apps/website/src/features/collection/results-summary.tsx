import { XIcon } from "lucide-react";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { FilterSummary } from "./filter-summary";
import type { FilterChip } from "./filter-chips";

export function CollectionResultsSummary({
  total,
  unit,
  chips,
  onClear,
}: {
  total: number;
  unit: string;
  chips: FilterChip[];
  onClear: () => void;
}) {
  return (
    <FilterSummary
      status={
        <p role="status" className="whitespace-nowrap text-xs text-muted-foreground">
          共 <span className="font-medium tabular-nums text-foreground">{total}</span> {unit}
        </p>
      }
      chips={chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="h-auto max-w-full shrink-0 gap-1 pr-1">
          <span className="truncate">{chip.label}</span>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`移除${chip.label}`}
            onClick={chip.remove}
          >
            <XIcon />
          </Button>
        </Badge>
      ))}
      onClear={onClear}
    />
  );
}
