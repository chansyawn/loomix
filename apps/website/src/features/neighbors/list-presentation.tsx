import { Skeleton } from "@/ui/components/skeleton";
import { ListCardSkeleton } from "../list-page/card-skeleton";
import { compactGrid } from "../list-page/grid-layout";
import { tableLinkClassName, type ListColumn } from "../list-page/table-columns";
import { RecordImage } from "../omnidex/record-image";
import { NeighborLink, NeighborStars } from "./neighbor-card";
import { galaxies } from "./search";
import type { NeighborDetail } from "./view";

export const neighborsListPresentation = {
  toolbar: { title: "友邻", searchLabel: "搜索友邻名称", placeholder: "搜索友邻名称或拼音…" },
  choice: { label: "星系筛选", allLabel: "全部星系" },
  options: galaxies.map((galaxy) => ({ value: galaxy, label: galaxy })),
  grid: compactGrid(78),
  card: (
    <ListCardSkeleton>
      <Skeleton className="h-5 w-3/4" />
    </ListCardSkeleton>
  ),
};

export const neighborColumns: ListColumn<NeighborDetail>[] = [
  {
    id: "name",
    header: "友邻",
    width: 192,
    cell: (neighbor) => (
      <div className="flex min-w-0 items-center gap-3">
        <RecordImage
          image={neighbor.portrait?.image ?? null}
          name=""
          inset="sm"
          fallback="icon"
          className="size-10 shrink-0 rounded-md"
        />
        <NeighborLink neighbor={neighbor} className={tableLinkClassName} />
      </div>
    ),
    skeleton: (
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0" />
        <Skeleton className="h-4 w-20" />
      </div>
    ),
  },
  {
    id: "stars",
    header: "所属星球与星系",
    width: 264,
    cell: (neighbor) => <NeighborStars stars={neighbor.stars} />,
  },
];
