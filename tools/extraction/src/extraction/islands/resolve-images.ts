import type { IconMatch, IndexedAsset } from "../types.ts";
import { createIconResolver } from "../images/resolve.ts";
import { normalizeAssetPath, preferOverlay } from "../../client/asset-map.ts";

export function createIslandImageResolver(textures: IndexedAsset[], sprites: IndexedAsset[]) {
  const exact = createIconResolver(textures, sprites);
  const named = new Map<string, IndexedAsset[]>();
  for (const sprite of sprites) {
    if (!sprite.Name || !sprite.Container) continue;
    const name = normalizeAssetPath(sprite.Name);
    const entries = named.get(name) ?? [];
    entries.push(sprite);
    named.set(name, entries);
  }
  return (reference: string): IconMatch | null => {
    const match = exact(reference);
    if (match?.matched) return match;
    if (!reference.startsWith("UISprite/")) return null;
    const variants = named.get(normalizeAssetPath(reference.split("/").at(-1)!)) ?? [];
    const preferred = preferOverlay(variants);
    if (!preferred) return match;
    const overlay = /[\\/]Persistent[\\/]/i.test(preferred.Source);
    const active = variants.filter(
      (entry) => /[\\/]Persistent[\\/]/i.test(entry.Source) === overlay,
    );
    // 图集 Sprite 名称可能与容器文件名不同；只有当前生效对象唯一时才能安全匹配。
    if (new Set(active.map((entry) => `${entry.Source}|${entry.PathID}`)).size !== 1) return match;
    return {
      reference,
      matched: true,
      assetType: "Sprite",
      resourceName: preferred.Name!,
      container: preferred.Container!,
      source: preferred.Source,
      pathId: preferred.PathID,
      sourceVariants: variants.map((entry) => ({ source: entry.Source, pathId: entry.PathID })),
      matchMethod: "unique_sprite_name",
    };
  };
}
