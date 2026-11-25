import { XIcon } from "lucide-react";
import { Badge } from "@/ui/components/badge";
import { FilterSummary } from "./filter-summary";
export interface FilterChip {
  key: string;
  label: string;
  remove: () => void;
}

export function ListResultsSummary({
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
        <p role="status" className="text-xs whitespace-nowrap text-muted-foreground">
          共 <span className="font-medium text-foreground tabular-nums">{total}</span> {unit}
        </p>
      }
      chips={chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="min-h-6 max-w-full shrink-0"
          render={<button type="button" aria-label={`移除${chip.label}`} onClick={chip.remove} />}
        >
          <span className="truncate">{chip.label}</span>
          <XIcon data-icon="inline-end" aria-hidden="true" />
        </Badge>
      ))}
      onClear={onClear}
    />
  );
}
