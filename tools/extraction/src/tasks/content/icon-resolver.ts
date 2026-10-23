import type { IndexedAsset, IconMatch } from "./types.ts";
import { profile } from "./config.ts";
import { normalizeAssetPath, preferOverlay } from "../../client/asset-map.ts";

export function createIconResolver(textures: IndexedAsset[], sprites: IndexedAsset[]) {
  const assets = new Map<string, IndexedAsset[]>(),
    spriteAssets = new Map<string, IndexedAsset[]>();
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
  }
  return (reference: string): IconMatch | null => {
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
    return {
      reference,
      matched: !!preferred,
      assetType,
      resourceName: preferred?.Name ?? null,
      container: preferred?.Container ?? null,
      source: preferred?.Source ?? null,
      pathId: preferred?.PathID ?? null,
      sourceVariants: variants.map((a) => ({ source: a.Source, pathId: a.PathID })),
      matchMethod: preferred ? "exact_config_path" : null,
    };
  };
}
