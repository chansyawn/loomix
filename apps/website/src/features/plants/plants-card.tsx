import { Link } from "@tanstack/react-router";
import type { PlantItem, PlantSeries } from "../collection-view.ts";
import type { PlantSeed } from "./model";
import { RecordImage } from "@/features/collection/record-image";
import { CollectionCard } from "@/features/collection/collection-card";
import { usePlantsOrigin } from "./detail-navigation";
import { collectionItemLocation, cropDetailLocation } from "../collection/item-route";
import { seedSourceLabels } from "./query";

export function PlantsCard({ item }: { item: PlantItem }) {
  const origin = usePlantsOrigin();
  return (
    <CollectionCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link
          {...collectionItemLocation({ ...item, catalogCategory: "plants" })}
          state={{ plantsOrigin: origin }}
        >
          {item.name}
        </Link>
      }
      tags={item.category}
    />
  );
}

export function PlantSeriesCard({ series }: { series: PlantSeries }) {
  const origin = usePlantsOrigin();
  return (
    <CollectionCard
      name={series.name}
      quality={series.quality}
      image={<RecordImage key={series.image} image={series.image} name={series.name} />}
      titleLink={
        <Link
          to="/collection/plants/series/$id"
          params={{ id: String(series.id) }}
          search={{ tab: undefined }}
          state={{ plantsOrigin: origin }}
        >
          {series.name}
        </Link>
      }
      description={series.description}
      tags={series.plantIds === null ? null : `${series.plantIds.length} 种植物`}
    />
  );
}

export function SeedCard({ seed, series }: { seed: PlantSeed; series: PlantSeries[] }) {
  const origin = usePlantsOrigin();
  const tags = [
    series.map((group) => group.name).join("、"),
    seed.detail.harvestCount === null ? null : `${seed.detail.harvestCount} 茬`,
    seedSourceLabels(seed).join("、"),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
  return (
    <CollectionCard
      name={seed.name}
      quality={seed.quality}
      image={<RecordImage key={seed.image} image={seed.image} name={seed.name} />}
      titleLink={
        seed.cropSeriesId === null ? (
          seed.name
        ) : (
          <Link {...cropDetailLocation(seed.cropSeriesId)} state={{ plantsOrigin: origin }}>
            {seed.name}
          </Link>
        )
      }
      description={seed.description}
      tags={tags || null}
    />
  );
}
