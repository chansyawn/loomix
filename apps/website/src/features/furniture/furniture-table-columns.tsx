import { createColumnHelper, rowSortingFeature, tableFeatures } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import type { FurnitureItem, FurnitureSet } from "../collection-view";
import { QualityBadge } from "@/ui/collection/quality";
import { useFurnitureOrigin } from "./detail-navigation";
import { FurnitureImage } from "./furniture-image";
import type { View } from "./search";

export type FurnitureRow = FurnitureItem | FurnitureSet;
export const furnitureTableFeatures = tableFeatures({ rowSortingFeature });
const columnHelper = createColumnHelper<typeof furnitureTableFeatures, FurnitureRow>();

export const furnitureColumnWidths: Record<string, number> = {
  name: 240,
  quality: 112,
  category: 112,
  type: 160,
  size: 112,
  colors: 144,
  materials: 144,
  sources: 240,
  sets: 240,
  seriesName: 160,
  members: 128,
  description: 320,
};

const linkClassName =
  "rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function FurnitureNameCell({ record }: { record: FurnitureRow }) {
  const origin = useFurnitureOrigin();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="w-10 shrink-0 overflow-hidden rounded-md" aria-hidden="true">
        <FurnitureImage image={record.image} name={record.name} compact />
      </div>
      <Link
        to={
          "category" in record
            ? "/collection/furniture/items/$id"
            : "/collection/furniture/sets/$id"
        }
        params={{ id: String(record.id) }}
        state={{ furnitureOrigin: origin }}
        className={`${linkClassName} truncate`}
        title={record.name}
      >
        {record.name}
      </Link>
    </div>
  );
}

function MembershipCell({ sets }: { sets: FurnitureSet[] | undefined }) {
  const origin = useFurnitureOrigin();
  if (!sets?.length) return <span className="text-muted-foreground">未归入套装</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {sets.map((set) => (
        <Link
          key={set.id}
          to="/collection/furniture/sets/$id"
          params={{ id: String(set.id) }}
          state={{ furnitureOrigin: origin }}
          className={linkClassName}
        >
          {set.name}
        </Link>
      ))}
    </div>
  );
}

function TextCell({ value }: { value: string | null }) {
  return value ? (
    <span className="block truncate" title={value}>
      {value}
    </span>
  ) : (
    <span className="text-muted-foreground">未提供</span>
  );
}

const commonColumns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "名称",
    enableSorting: true,
    cell: ({ row }) => <FurnitureNameCell record={row.original} />,
  }),
  columnHelper.accessor("quality", {
    header: "品阶",
    enableSorting: true,
    cell: ({ row }) =>
      row.original.quality === null ? (
        <TextCell value={null} />
      ) : (
        <QualityBadge quality={row.original.quality} />
      ),
  }),
]);

export function furnitureTableColumns(view: View, memberships: Map<number, FurnitureSet[]>) {
  if (view === "sets")
    return columnHelper.columns([
      ...commonColumns,
      columnHelper.display({
        id: "seriesName",
        header: "系列",
        cell: ({ row }) => (
          <TextCell value={"seriesName" in row.original ? row.original.seriesName : null} />
        ),
      }),
      columnHelper.display({
        id: "members",
        header: "成员数量",
        cell: ({ row }) => {
          const ids = "componentIds" in row.original ? row.original.componentIds : null;
          return ids === null ? (
            <TextCell value={null} />
          ) : (
            <span className="tabular-nums">{ids.length} 件家具</span>
          );
        },
      }),
      columnHelper.accessor("description", {
        header: "描述",
        cell: ({ row }) => <TextCell value={row.original.description} />,
      }),
    ]);

  return columnHelper.columns([
    ...commonColumns,
    ...(
      [
        ["category", "分类"],
        ["type", "类型"],
        ["size", "尺寸"],
        ["colors", "颜色"],
        ["materials", "材质"],
        ["sources", "获取途径"],
      ] as const
    ).map(([key, header]) =>
      columnHelper.display({
        id: key,
        header,
        cell: ({ row }) => (
          <TextCell value={"category" in row.original ? row.original[key] : null} />
        ),
      }),
    ),
    columnHelper.display({
      id: "sets",
      header: "所属套装",
      cell: ({ row }) => <MembershipCell sets={memberships.get(row.original.id)} />,
    }),
  ]);
}
