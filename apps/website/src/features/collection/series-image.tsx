import type { CollectionRecord } from "../collection-view.ts";
import { RecordImage } from "./record-image";
import { seriesPreview } from "./series-preview";

export function SeriesImage({
  name,
  image,
  memberIds,
  items,
  eager = false,
}: {
  name: string;
  image: string | null;
  memberIds: readonly number[] | null;
  items: readonly Pick<CollectionRecord, "id" | "name" | "image">[];
  eager?: boolean;
}) {
  const preview = image ? [] : seriesPreview(memberIds, items);
  if (image || preview.length === 0)
    return <RecordImage key={image} image={image} name={name} scene eager={eager} />;
  return (
    <div className="grid aspect-2/1 grid-cols-3 grid-rows-2 gap-1 overflow-hidden bg-muted p-2 [&_img]:p-2 [&>div]:aspect-auto [&>div]:min-h-0">
      {Array.from({ length: 6 }, (_, index) => {
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
