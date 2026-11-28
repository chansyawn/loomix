import type { IndexedAsset, IconMatch } from "../types.ts";
import { profile } from "../../profile.ts";
import { normalizeAssetPath } from "../../client/asset-map.ts";

export function createIconResolver(textures: IndexedAsset[], sprites: IndexedAsset[]) {
  const assets = new Map<string, IndexedAsset[]>(),
    spriteAssets = new Map<string, IndexedAsset[]>(),
    spritesByFolderName = new Map<string, IndexedAsset[]>();
  for (const a of textures) {
    if (!a.Container || !a.Name) continue;
    const key = normalizeAssetPath(a.Container);
    if (!assets.has(key)) assets.set(key, []);
    assets.get(key)!.push(a);
  }
  for (const a of sprites) {
    if (!a.Container || !a.Name) continue;
    const key = normalizeAssetPath(a.Container) + "|" + normalizeAssetPath(a.Name);
    if (!spriteAssets.has(key)) spriteAssets.set(key, []);
    spriteAssets.get(key)!.push(a);
    const folderName = normalizeAssetPath(
      a.Container.slice(0, a.Container.lastIndexOf("/") + 1) + a.Name,
    );
    const siblings = spritesByFolderName.get(folderName) ?? [];
    siblings.push(a);
    spritesByFolderName.set(folderName, siblings);
  }
  const preferOverlay = (variants: IndexedAsset[]): IndexedAsset | undefined => {
    const overlay = variants.filter((asset) => /[\\/]Persistent[\\/]/i.test(asset.Source));
    const active = overlay.length ? overlay : variants;
    if (new Set(active.map((asset) => `${asset.Source}:${asset.PathID}`)).size > 1)
      throw new Error(
        `Ambiguous authoritative image reference: ${active.map((asset) => `${asset.Source}:${asset.PathID}`).join(", ")}`,
      );
    return active[0];
  };
  return (reference: string, allowAtlasName = false): IconMatch | null => {
    if (!reference?.startsWith("UISprite/")) return null;
    const key = normalizeAssetPath(profile.assetPrefix + reference);
    let variants = assets.get(key) ?? [],
      preferred = preferOverlay(variants),
      assetType = "Texture2D";
    if (!preferred || preferred.Name?.startsWith("sactx-")) {
      variants =
        spriteAssets.get(key + "|" + normalizeAssetPath(reference.split("/").at(-1)!)) ?? [];
      preferred = preferOverlay(variants);
      assetType = "Sprite";
    }
    let matchMethod = preferred ? "exact_config_path" : null;
    if (!preferred && allowAtlasName) {
      variants = spritesByFolderName.get(key) ?? [];
      preferred = preferOverlay(variants);
      if (preferred) matchMethod = "unique_sprite_name";
    }
    return {
      reference,
      matched: !!preferred,
      assetType,
      resourceName: preferred?.Name ?? null,
      container: preferred?.Container ?? null,
      source: preferred?.Source ?? null,
      pathId: preferred?.PathID ?? null,
      sourceVariants: variants.map((a) => ({ source: a.Source, pathId: a.PathID })),
      matchMethod,
    };
  };
}
