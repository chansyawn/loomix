import { SeedNameLink } from "./seed-info";
import { Link } from "@tanstack/react-router";
import type { PlantItem, PlantSeries } from "../collection-view.ts";
import type { PlantSeed } from "./model";
import { RecordImage } from "@/features/collection/record-image";
import { CollectionCard } from "@/features/collection/collection-card";
import { useCollectionOrigin } from "@/features/collection/navigation";
import { collectionItemLocation } from "../collection/item-route";

export function PlantsCard({ item }: { item: PlantItem }) {
  const origin = useCollectionOrigin();
  return (
    <CollectionCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link
          {...collectionItemLocation({ ...item, catalogCategory: "plants" })}
          state={{ collectionOrigin: origin }}
        >
          {item.name}
        </Link>
      }
      tags={item.category}
    />
  );
}

export function PlantSeriesCard({ series }: { series: PlantSeries }) {
  const origin = useCollectionOrigin();
  return (
    <CollectionCard
      name={series.name}
      quality={series.quality}
      image={<RecordImage key={series.image} image={series.image} name={series.name} />}
      titleLink={
        <Link
          to="/collections/records/$id"
          params={{ id: String(series.id) }}
          search={{ focus: undefined }}
          state={{ collectionOrigin: origin }}
        >
          {series.name}
        </Link>
      }
      description={series.description}
      tags={series.plantIds === null ? null : `${series.plantIds.length} 种植物`}
    />
  );
}

export function SeedCard({ seed }: { seed: PlantSeed }) {
  return (
    <CollectionCard
      name={seed.name}
      quality={seed.quality}
      image={<RecordImage key={seed.image} image={seed.image} name={seed.name} />}
      titleLink={<SeedNameLink seed={seed} />}
      description={seed.description}
    />
  );
}
