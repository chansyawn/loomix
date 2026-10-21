import { profile } from "./config.mjs";

export const normalizeAssetPath = (value) =>
  value
    .toLowerCase()
    .replaceAll("\\", "/")
    .replace(/\.(png|jpe?g|tga|psd)$/, "");
const preferOverlay = (variants) =>
  variants.find((a) => /[\\/]Persistent[\\/]/i.test(a.Source)) ?? variants[0];

export function createIconResolver(textures, sprites) {
  const assets = new Map(),
    spriteAssets = new Map();
  for (const a of textures) {
    if (!a.Container) continue;
    const key = normalizeAssetPath(a.Container);
    if (!assets.has(key)) assets.set(key, []);
    assets.get(key).push(a);
  }
  for (const a of sprites) {
    if (!a.Container || !a.Name) continue;
    const key = normalizeAssetPath(a.Container) + "|" + normalizeAssetPath(a.Name);
    if (!spriteAssets.has(key)) spriteAssets.set(key, []);
    spriteAssets.get(key).push(a);
  }
  return (reference) => {
    if (!reference?.startsWith("UISprite/")) return null;
    const key = normalizeAssetPath(profile.assetPrefix + reference);
    let variants = assets.get(key) ?? [],
      preferred = preferOverlay(variants),
      assetType = "Texture2D";
    if (!preferred || preferred.Name.startsWith("sactx-")) {
      variants =
        spriteAssets.get(key + "|" + normalizeAssetPath(reference.split("/").at(-1))) ?? [];
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
