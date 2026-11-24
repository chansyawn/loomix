import { LayoutGridIcon, TableIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import type { ListLayout } from "./layout";

export function ListLayoutToggle({
  title,
  layout,
  onLayoutChange,
  disabled = false,
}: {
  title: string;
  layout: ListLayout;
  onLayoutChange?: (value: ListLayout) => void;
  disabled?: boolean;
}) {
  return (
    <ToggleGroup
      aria-label={`${title}展示方式`}
      variant="outline"
      spacing={0}
      value={[layout]}
      disabled={disabled}
      onValueChange={([value]) => {
        if (value === "grid" || value === "table") onLayoutChange?.(value);
      }}
    >
      <ToggleGroupItem value="grid" aria-label="卡片视图">
        <LayoutGridIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="列表视图">
        <TableIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
