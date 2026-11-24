import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import type { FilterChip } from "./results-summary";

export type ListChoice = { value: string; label: string };

export function choiceFilterChips(
  search: { value: string; clear: () => void },
  choice: { label: string | undefined; clear: () => void },
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (search.value.trim())
    chips.push({ key: "q", label: `搜索：${search.value}`, remove: search.clear });
  if (choice.label) chips.push({ key: "choice", label: choice.label, remove: choice.clear });
  return chips;
}

export function ListChoiceFilter({
  label,
  allLabel,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  allLabel: string;
  options: readonly ListChoice[];
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      className="max-w-full flex-wrap"
      variant="outline"
      value={[value]}
      disabled={disabled}
      onValueChange={([next]) => {
        if (next !== undefined) onChange?.(next);
      }}
    >
      <ToggleGroupItem value="">{allLabel}</ToggleGroupItem>
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
