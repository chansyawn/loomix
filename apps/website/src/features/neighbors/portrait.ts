import type { createImageResolver } from "@loomix/schema/assets";
import type { Neighbor } from "@loomix/schema/neighbors";

export function resolveNeighborPortrait(
  images: Neighbor["images"],
  resolveImage: ReturnType<typeof createImageResolver>,
) {
  const favour = resolveImage(images.favour);
  if (favour) return { image: favour, label: "好感插画" };

  const role = resolveImage(images.role);
  return role ? { image: role, label: "角色立绘" } : null;
}
