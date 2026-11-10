import { Link } from "@tanstack/react-router";
import { seedLocation } from "./seed-location";
import { useCollectionOrigin } from "@/features/collection/navigation";
import type { PlantSeed } from "./model";

export function SeedNameLink({ seed }: { seed: PlantSeed }) {
  const origin = useCollectionOrigin();
  return (
    <Link {...seedLocation(seed)} state={{ collectionOrigin: origin }}>
      {seed.name}
    </Link>
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
