import { Link } from "@tanstack/react-router";
import type { MiscellaneousItem } from "../collection-view.ts";
import { CollectionCard } from "@/features/collection/collection-card";
import { RecordImage } from "@/features/collection/record-image";
import { useMiscellanyOrigin } from "./detail-navigation";

export function MiscellanyCard({ item }: { item: MiscellaneousItem }) {
  const origin = useMiscellanyOrigin();
  return (
    <CollectionCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link
          to="/collection/miscellany/items/$id"
          params={{ id: String(item.id) }}
          state={{ miscellanyOrigin: origin }}
        >
          {item.name}
        </Link>
      }
    />
  );
}
