import { normalizeAssetPath } from "../../../client/asset-map.ts";
import type { EvidenceSource } from "../../evidence/domain-schema.ts";
import type { imageCollector } from "../images.ts";

export function collectNeighborOutfitImage(
  images: Pick<ReturnType<typeof imageCollector>, "configured" | "need">,
  id: number,
  references: readonly string[],
  sources: EvidenceSource[],
): string {
  const owner = { kind: "neighborClothing", id, field: "image" } as const;
  const configured = references.filter((reference) => reference.trim());
  if (!configured.length) throw new Error(`Missing neighbor outfit icon ${id}`);
  const reference = configured.find(
    (path) => normalizeAssetPath(path.trim()) !== "uisprite/load/item/cloud",
  );
  if (reference) return images.configured(owner, reference, "icon", sources, true);
  return images.need(
    owner,
    [],
    "icon",
    sources,
    "neighbor_clothing_placeholder_icon",
    false,
    configured,
  );
}
