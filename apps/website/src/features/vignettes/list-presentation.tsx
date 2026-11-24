import { Link } from "@tanstack/react-router";
import { ListCardSkeleton } from "@/features/list-page/card-skeleton";
import { wideGrid } from "@/features/list-page/grid-layout";
import {
  textColumn,
  tableLinkClassName,
  type ListColumn,
} from "@/features/list-page/table-columns";
import { RecordImage } from "@/features/omnidex/record-image";
import type { VignetteOrigin } from "./navigation";
import { siteLabels, type VignetteSummary } from "./view";

export const vignetteListPresentation = {
  toolbar: { title: "小栖地", searchLabel: "搜索小栖地名称", placeholder: "搜索小栖地名称或拼音…" },
  choice: { label: "小栖地地形筛选", allLabel: "全部地形" },
  options: Object.entries(siteLabels).map(([value, label]) => ({ value, label })),
  grid: wideGrid(80),
  card: <ListCardSkeleton imageClassName="aspect-2/1" tags />,
};

export function VignetteLink({
  entry,
  origin,
  className,
}: {
  entry: VignetteSummary;
  origin?: VignetteOrigin;
  className?: string;
}) {
  return (
    <Link
      to="/vignettes/$id"
      params={{ id: String(entry.id) }}
      state={origin && { vignetteOrigin: origin }}
      className={className}
    >
      {entry.name}
    </Link>
  );
}

export function vignetteColumns(origin?: VignetteOrigin): ListColumn<VignetteSummary>[] {
  return [
    {
      id: "name",
      header: "名称",
      width: 240,
      cell: (entry) => (
        <div className="flex min-w-0 items-center gap-2">
          <RecordImage
            image={entry.image}
            name=""
            inset="none"
            fallback="icon"
            className="aspect-2/1 w-12 shrink-0 rounded-md"
          />
          <VignetteLink entry={entry} origin={origin} className={tableLinkClassName} />
        </div>
      ),
    },
    textColumn("size", "尺寸", 110, (entry) => entry.size),
    textColumn("stars", "星级", 80, (entry) => entry.stars),
    textColumn("terrain", "地形", 90, (entry) => entry.terrain),
  ];
}
