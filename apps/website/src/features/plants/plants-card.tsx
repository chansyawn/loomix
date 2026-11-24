import { SeedNameLink } from "./seed-info";
import { Link } from "@tanstack/react-router";
import type { PlantItem, PlantSeries } from "../omnidex-view.ts";
import type { PlantSeed } from "./model";
import { RecordImage } from "@/features/omnidex/record-image";
import { RecordListCard } from "@/features/omnidex/record-list-card";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import { catalogEntryLocation } from "../omnidex/entry-location";

export function PlantsCard({ item }: { item: PlantItem }) {
  const origin = useOmnidexOrigin();
  return (
    <RecordListCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link {...catalogEntryLocation(item)} state={{ omnidexOrigin: origin }}>
          {item.name}
        </Link>
      }
      tags={item.category}
    />
  );
}

export function PlantSeriesCard({ series }: { series: PlantSeries }) {
  const origin = useOmnidexOrigin();
  return (
    <RecordListCard
      name={series.name}
      quality={series.quality}
      image={<RecordImage key={series.image} image={series.image} name={series.name} />}
      titleLink={
        <Link {...catalogEntryLocation(series)} state={{ omnidexOrigin: origin }}>
          {series.name}
        </Link>
      }
      tags={series.plantIds === null ? null : `${series.plantIds.length} 种植物`}
    />
  );
}

export function SeedCard({ seed }: { seed: PlantSeed }) {
  return (
    <RecordListCard
      name={seed.name}
      quality={seed.quality}
      image={<RecordImage key={seed.image} image={seed.image} name={seed.name} />}
      titleLink={<SeedNameLink seed={seed} />}
    />
  );
}
