import { Link } from "@tanstack/react-router";
import { ListCard } from "../list-page/list-card";
import type { NeighborDetail } from "./data";
import { NeighborImage } from "./image";
import { useNeighborsOrigin } from "./navigation";

export function NeighborLink({
  neighbor,
  className,
}: {
  neighbor: NeighborDetail;
  className?: string;
}) {
  const origin = useNeighborsOrigin();
  return (
    <Link
      to="/neighbors/$id"
      params={{ id: String(neighbor.id) }}
      state={{ neighborsOrigin: origin }}
      className={className}
    >
      {neighbor.name}
    </Link>
  );
}

export function galaxyNames(neighbor: NeighborDetail) {
  return neighbor.galaxies.join("、");
}

export function NeighborCard({ neighbor }: { neighbor: NeighborDetail }) {
  return (
    <ListCard
      name={neighbor.name}
      image={
        <NeighborImage
          image={neighbor.portrait?.image ?? null}
          name={`${neighbor.name}的${neighbor.portrait?.label ?? "肖像"}`}
          className="aspect-square bg-muted p-4"
        />
      }
      titleLink={<NeighborLink neighbor={neighbor} />}
      tags={galaxyNames(neighbor)}
    />
  );
}
