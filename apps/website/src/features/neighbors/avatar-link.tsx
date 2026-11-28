import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { resourceUrl } from "@/infrastructure/resources";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/tooltip";
import type { NeighborAvatar } from "../detail-page/field-model";
import { useOmnidexOrigin } from "../omnidex/navigation";

export function NeighborAvatarLink({
  neighbor,
  hash,
}: {
  neighbor: NeighborAvatar;
  hash?: string;
}) {
  const origin = useOmnidexOrigin();
  const [failed, setFailed] = useState<string | null>(null);
  const image = neighbor.avatar;
  const link = (
    <Link
      to="/neighbors/$id"
      params={{ id: String(neighbor.id) }}
      hash={hash}
      state={{ omnidexOrigin: origin }}
      aria-label={neighbor.name}
      className="inline-flex min-h-8 items-center rounded-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
    >
      {image && failed !== image ? (
        <img
          src={resourceUrl(image)}
          alt=""
          width={32}
          height={32}
          className="size-8 object-contain"
          onError={() => setFailed(image)}
        />
      ) : (
        neighbor.name
      )}
    </Link>
  );
  if (!image || failed === image) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent>{neighbor.name}</TooltipContent>
    </Tooltip>
  );
}
