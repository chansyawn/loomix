import { Link } from "@tanstack/react-router";
import { ListCardSkeleton } from "@/features/list-page/card-skeleton";
import { wideGrid } from "@/features/list-page/grid-layout";
import {
  textColumn,
  tableLinkClassName,
  type ListColumn,
} from "@/features/list-page/table-columns";
import { ListCard } from "@/features/list-page/list-card";
import { RecordImage } from "@/features/omnidex/record-image";
import type { StarseaSearch } from "./search";
import type { StarseaIslet } from "./view";

type Origin = { search: StarseaSearch; index: number };

export const starseaListPresentation = {
  toolbar: { title: "星海", searchLabel: "搜索星屿名", placeholder: "搜索星屿名或拼音…" },
  choice: { label: "星海区域筛选", allLabel: "全部星海" },
  grid: wideGrid(80),
  card: <ListCardSkeleton imageClassName="aspect-2/1" tags />,
};

function regionNames(islet: StarseaIslet) {
  return islet.regions.map(({ name }) => name).join("、");
}

function IsletLink({
  islet,
  origin,
  className,
}: {
  islet: StarseaIslet;
  origin?: Origin;
  className?: string;
}) {
  return (
    <Link
      to="/starsea/islets/$id"
      params={{ id: String(islet.id) }}
      state={origin && { starseaOrigin: origin }}
      className={className}
    >
      {islet.name}
    </Link>
  );
}

export function IsletCard({ islet, origin }: { islet: StarseaIslet; origin: Origin }) {
  const region = regionNames(islet);
  return (
    <ListCard
      name={islet.name}
      image={
        <RecordImage
          key={islet.image}
          image={islet.image}
          name={islet.name}
          fit={islet.illustrated ? "cover" : "contain"}
          inset={islet.illustrated ? "none" : "lg"}
          className="aspect-2/1"
        />
      }
      titleLink={<IsletLink islet={islet} origin={origin} />}
      tags={islet.encounterOnly ? `${region} · 邂逅候选` : region}
    />
  );
}

export function isletColumns(origin?: Origin): ListColumn<StarseaIslet>[] {
  return [
    {
      id: "name",
      header: "星屿",
      width: 210,
      cell: (islet) => (
        <div className="flex min-w-0 items-center gap-2">
          <RecordImage
            key={islet.image}
            image={islet.image}
            name=""
            fit={islet.illustrated ? "cover" : "contain"}
            inset="none"
            fallback="icon"
            className="aspect-2/1 w-12 shrink-0 rounded-md"
          />
          <IsletLink islet={islet} origin={origin} className={tableLinkClassName} />
        </div>
      ),
    },
    textColumn("region", "所属星海", 160, regionNames),
    textColumn("encounter", "备注", 96, (islet) => (islet.encounterOnly ? "邂逅候选" : "—")),
  ];
}
