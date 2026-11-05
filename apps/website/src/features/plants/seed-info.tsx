import { Link } from "@tanstack/react-router";
import type { PlantSeed } from "./model";
import { usePlantsOrigin } from "./detail-navigation";
import { cropDetailLocation } from "../collection/item-route";

export function PlantSeedLinks({ seeds }: { seeds: PlantSeed[] }) {
  const origin = usePlantsOrigin();
  if (!seeds.length) return <span className="text-muted-foreground">未提供</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {seeds.map((seed) =>
        seed.cropSeriesId === null ? (
          <span key={seed.id}>{seed.name}</span>
        ) : (
          <Link
            key={seed.id}
            {...cropDetailLocation(seed.cropSeriesId)}
            state={{ plantsOrigin: origin }}
            className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {seed.name}
          </Link>
        ),
      )}
    </div>
  );
}
