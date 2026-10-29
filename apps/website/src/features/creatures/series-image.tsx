import type { CreatureItem, CreatureSeries } from "../collection-view.ts";
import { RecordImage } from "@/features/collection/record-image";
import { seriesPreview } from "./query";

export function SeriesImage({
  series,
  items,
  eager = false,
}: {
  series: CreatureSeries;
  items: CreatureItem[];
  eager?: boolean;
}) {
  const preview = seriesPreview(series, items);
  if (series.image || preview.length === 0)
    return (
      <RecordImage key={series.image} image={series.image} name={series.name} scene eager={eager} />
    );
  return (
    <div className="grid aspect-2/1 grid-cols-2 grid-rows-2 gap-1 overflow-hidden bg-muted p-2 [&_img]:p-2 [&>div]:aspect-auto [&>div]:min-h-0">
      {Array.from({ length: 4 }, (_, index) => {
        const item = preview[index];
        return item ? (
          <RecordImage key={item.id} image={item.image} name={item.name} eager={eager} />
        ) : (
          <div key={`empty-${index}`} />
        );
      })}
    </div>
  );
}
