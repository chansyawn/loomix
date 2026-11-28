import { profile } from "../../profile.ts";
import { createIconResolver } from "../images/resolve.ts";
import type { IndexedAsset } from "../types.ts";
import type { imageCollector } from "../source/images.ts";
import type { ClientIconImage } from "./model.ts";

export function clientIconAtlas(reference: string): string | null {
  if (
    /^UISprite\/Load\/GalleryHandbook\/CreatureHabit_(?:24h|Day|Night|Midday|NoRainy|Rainy)(?:\.png)?$/.test(
      reference,
    )
  )
    return `${profile.assetPrefix}uisprite/load/galleryhandbook/itemgalleryhandbook/44083_cre_4insect_daheisaijingui_s.png`;
  if (
    /^UISprite\/Load\/Appearance\/LayoutIcon_Appearance_(?:Accessories|Jumpsuit|Hairband|Earring)(?:\.png)?$/.test(
      reference,
    )
  )
    return profile.hairDyeing.spriteAtlas;
  return null;
}

export function clientIconResolver(
  index: IndexedAsset[],
  locate: ReturnType<typeof imageCollector>["locate"],
) {
  const sprites = index.filter((entry) => entry.Type === "Sprite");
  const resolve = createIconResolver([], sprites);
  const cache = new Map<string, ClientIconImage>();
  return (reference: string): ClientIconImage => {
    const cached = cache.get(reference);
    if (cached) return cached;
    const name = reference
      .split("/")
      .at(-1)!
      .replace(/\.png$/i, "");
    const match = resolve(reference, true);
    let image: ClientIconImage;
    if (
      match?.source &&
      match.pathId &&
      match.container &&
      match.resourceName &&
      (match.matchMethod === "exact_config_path" || match.matchMethod === "unique_sprite_name")
    ) {
      const object = locate({
        reference,
        source: match.source,
        pathId: match.pathId,
        container: match.container,
        resourceName: match.resourceName,
        assetType: "Sprite",
      });
      image = { reference, object: object.key, method: match.matchMethod };
    } else {
      const atlas = clientIconAtlas(reference);
      const candidates = sprites.filter(
        (entry) => atlas && entry.Container === atlas && entry.Name === name,
      );
      const overlay = candidates.filter((entry) => entry.Source.includes("/Persistent/"));
      const active = overlay.length ? overlay : candidates;
      const entry = active[0];
      if (
        !entry ||
        !atlas ||
        new Set(active.map((asset) => `${asset.Source}:${asset.PathID}`)).size !== 1
      )
        throw new Error(
          `Unresolved client sprite ${reference}: ${active.map((asset) => `${asset.Source}:${asset.PathID}`).join(", ")}`,
        );
      const object = locate({
        reference,
        source: entry.Source,
        pathId: entry.PathID,
        container: atlas,
        resourceName: name,
        assetType: "Sprite",
      });
      image = { reference, object: object.key, method: "configured_atlas_member" };
    }
    cache.set(reference, image);
    return image;
  };
}
