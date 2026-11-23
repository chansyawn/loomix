import { Link } from "@tanstack/react-router";
import { ListCard } from "../omnidex/list-card";
import { RecordImage } from "../omnidex/record-image";
import { recordColumns, textColumn, tableLinkClassName } from "../omnidex/table-columns";
import { useOmnidexOrigin } from "../omnidex/navigation";
import { categoryNames, type CatalogEntryRow } from "../omnidex/catalog";
import { catalogEntryLocation } from "../omnidex/entry-location";

export function RecordNameLink({ record }: { record: CatalogEntryRow }) {
  const origin = useOmnidexOrigin();
  return (
    <Link
      {...catalogEntryLocation(record)}
      state={{ omnidexOrigin: origin }}
      className={tableLinkClassName}
    >
      {record.name}
    </Link>
  );
}
export function CatalogCard({ record }: { record: CatalogEntryRow }) {
  return (
    <ListCard
      name={record.name}
      image={<RecordImage image={record.image} name={record.name} />}
      quality={record.quality}
      description={record.description}
      tags={categoryNames[record.category]}
      titleLink={<RecordNameLink record={record} />}
    />
  );
}
export function catalogColumns() {
  return [
    ...recordColumns<CatalogEntryRow>((record) => <RecordNameLink record={record} />),
    textColumn<CatalogEntryRow>("id", "编号", 112, (record) => record.id),
    textColumn<CatalogEntryRow>(
      "category",
      "类别",
      100,
      (record) => categoryNames[record.category],
    ),
    ...(
      [
        ["colors", "颜色"],
        ["materials", "材质"],
        ["styles", "风格"],
      ] as const
    ).map(([key, label]) =>
      textColumn<CatalogEntryRow>(key, label, 160, (record) => record[key].join("，")),
    ),
    textColumn<CatalogEntryRow>("acquisition", "获取来源", 280, (record) => record.acquisitionText),
    textColumn<CatalogEntryRow>("description", "介绍", 320, (record) => record.description),
  ];
}
