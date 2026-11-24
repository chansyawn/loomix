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

export function NeighborStars({ stars }: { stars: NeighborDetail["stars"] }) {
  if (!stars.length) return <p className="text-xs text-muted-foreground">星球与星系资料暂未收录</p>;
  return (
    <ul className="space-y-1 text-sm whitespace-normal text-muted-foreground">
      {stars.map(({ name, galaxy }) => (
        <li key={`${name}-${galaxy}`}>
          {name} <span className="text-xs">· {galaxy ? `${galaxy}星系` : "星系资料暂未收录"}</span>
        </li>
      ))}
    </ul>
  );
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
    >
      <NeighborStars stars={neighbor.stars} />
    </ListCard>
  );
}
