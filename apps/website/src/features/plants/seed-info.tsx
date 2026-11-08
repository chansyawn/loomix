import { Link } from "@tanstack/react-router";
import { seedLocations } from "./seed-location";
import { usePlantsOrigin } from "./detail-navigation";
import type { PlantSeed } from "./model";

export function SeedNameLink({ seed }: { seed: PlantSeed }) {
  const origin = usePlantsOrigin();
  const locations = seedLocations(seed);
  if (locations.length === 1)
    return (
      <Link {...locations[0]} state={{ plantsOrigin: origin }}>
        {seed.name}
      </Link>
    );
  return (
    <span className="inline-flex flex-wrap gap-x-2 gap-y-1">
      {seed.name}
      {locations.map((location, index) => (
        <Link key={location.params.id} {...location} state={{ plantsOrigin: origin }}>
          植物 {index + 1}
        </Link>
      ))}
    </span>
  );
}

export function PlantSeedLinks({ seeds }: { seeds: PlantSeed[] }) {
  if (!seeds.length) return <span className="text-muted-foreground">未提供</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {seeds.map((seed) => (
        <SeedNameLink key={seed.id} seed={seed} />
      ))}
    </div>
  );
}
