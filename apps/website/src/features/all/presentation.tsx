import { Link } from "@tanstack/react-router";
import { CollectionCard } from "../collection/collection-card";
import { RecordImage } from "../collection/record-image";
import { recordColumns, textColumn, tableLinkClassName } from "../collection/table-columns";
import { useCollectionOrigin } from "../collection/navigation";
import { recordLocation, categoryNames, type OverviewRecord } from "../collection/catalog";

export function RecordNameLink({ record }: { record: OverviewRecord }) {
  const origin = useCollectionOrigin();
  return (
    <Link
      {...recordLocation(record)}
      state={{ collectionOrigin: origin }}
      className={tableLinkClassName}
    >
      {record.name}
    </Link>
  );
}
export function AllCard({ record }: { record: OverviewRecord }) {
  return (
    <CollectionCard
      name={record.name}
      image={<RecordImage image={record.image} name={record.name} />}
      quality={record.quality}
      description={record.description}
      tags={categoryNames[record.category]}
      titleLink={<RecordNameLink record={record} />}
    />
  );
}
export function allColumns() {
  return [
    ...recordColumns<OverviewRecord>((record) => <RecordNameLink record={record} />),
    textColumn<OverviewRecord>("id", "编号", 112, (record) => record.id),
    textColumn<OverviewRecord>("category", "类别", 100, (record) => categoryNames[record.category]),
    ...(
      [
        ["colors", "颜色"],
        ["materials", "材质"],
        ["styles", "风格"],
      ] as const
    ).map(([key, label]) =>
      textColumn<OverviewRecord>(key, label, 160, (record) => record[key].join("，")),
    ),
    textColumn<OverviewRecord>("acquisition", "获取来源", 280, (record) => record.acquisitionText),
    textColumn<OverviewRecord>("description", "介绍", 320, (record) => record.description),
  ];
}
